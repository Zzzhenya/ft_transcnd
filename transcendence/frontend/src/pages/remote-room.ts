// frontend/src/pages/remote-room.ts
import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { WS_BASE } from "@/app/config";
import { createLocalScene } from "@/renderers/babylon/local-scene";

interface RemotePlayer {
  playerId: string;
  playerNumber: number;
  username: string;
  ready: boolean;
}

interface RemoteGameState {
  roomId: string;
  playerId: string;
  playerNumber: number | null;
  ws: WebSocket | null; // current active websocket (lobby or central)
  connected: boolean;
  serverIdReady: boolean;
  wsConnectedRoomId?: string;
  gameStarted: boolean;
  score: { player1: number; player2: number };
  players: RemotePlayer[];

  centralGameId?: number | null;
  centralWsUrl?: string | null;

  // local control flags:
  centralStartSent?: boolean;
  centralGameEnded?: boolean;
}

let gameState: RemoteGameState | null = null;

// UI / rendering state
function isWsOpen() {
  return !!gameState?.connected;
}
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let keysPressed: Set<string> = new Set();
let pingTimer: number | null = null;
let lastPingTs: number | null = null;
let sceneController: { update: (s: any) => void; dispose: () => void } | null = null;
let lastRenderState: any | null = null;
let rafId: number | null = null;
let inputGateUntil = 0;
let ignoreStateUntil = 0;

// mount guards
let didMountRemoteRoom = false;
let isConnectingRemoteRoom = false;
let connectionCounter = 0;

// track when we intentionally leave the lobby WS for central game
let isTransitioningToCentral = false;

/* ---------- Entry point ---------- */
export default function (root: HTMLElement, ctxObj: { params?: { roomId?: string }; url: URL }) {
  // reset transition flag on mount
  isTransitioningToCentral = false;

  // determine roomId
  let roomId = ctxObj.params?.roomId ?? "";
  if (!roomId && ctxObj.url) {
    roomId = ctxObj.url.searchParams.get("roomId") ?? "";
  }

  if (!roomId) {
    navigate("/remote");
    return () => {};
  }

  const user = getAuth();
  const state = getState();
  const playerId = `${user?.id ?? "guest"}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const username = user?.name || state.session.alias || "Anonymous";

  gameState = {
    roomId,
    playerId,
    playerNumber: null,
    ws: null,
    connected: false,
    serverIdReady: false,
    wsConnectedRoomId: undefined,
    gameStarted: false,
    score: { player1: 0, player2: 0 },
    players: [],
    centralGameId: null,
    centralWsUrl: null,
    centralStartSent: false,
    centralGameEnded: false
  };

  if (didMountRemoteRoom || isConnectingRemoteRoom) {
    console.warn("⚠️ Remote room already mounted/connecting, skipping duplicate setup");
  } else {
    isConnectingRemoteRoom = true;
  }

  // HTML (kept familiar to your layout)
  root.innerHTML = `
    <section class="retro-wait py-6 md:py-8 space-y-6 max-w-6xl mx-auto px-4">
      <div class="crt-scan vignette bezel rounded-2xl p-5 md:p-6 border border-purple-500/30">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl sm:text-3xl font-black neon">WAITING ROOM</h1>
          <button id="leaveRoom" class="btn-retro px-4 py-2 rounded-lg text-white">⏎ LEAVE</button>
        </div>

        <!-- Status -->
        <div id="statusBox" class="mt-4 rounded-lg p-4 border border-purple-400/40 bg-purple-900/20">
          <p id="statusText" class="font-black neon-soft">Connecting...</p>
        </div>

        <!-- Waiting Room -->
        <div id="waitingRoom" class="mt-6 rounded-xl p-6 space-y-5 bezel border border-purple-500/30 bg-black/30">
          <div class="p-4 rounded-lg border border-indigo-400/40 bg-indigo-900/10">
            <p class="text-xs text-indigo-200/80 mb-2">ROOM CODE</p>
            <div class="flex flex-wrap items-center gap-3">
              <code class="text-2xl code-chip font-black text-indigo-200 tracking-widest">${roomId}</code>
              <button id="copyCode" class="btn-retro px-3 py-2 rounded-lg text-white text-sm">📋 COPY</button>
            </div>
            <p class="text-[11px] text-indigo-300/70 mt-2">Share this code with your friend</p>
          </div>

          <h2 class="text-xl font-black neon mt-2">PLAYERS <span class="blink"></span></h2>

          <div class="space-y-2">
            <div id="playersList" class="space-y-2"></div>
          </div>

          <button id="readyBtn" disabled class="btn-retro w-full px-4 py-4 rounded-lg text-indigo-50 font-black text-lg disabled:opacity-60">
            ⏳ Waiting for opponent...
          </button>
        </div>

        <!-- Game Canvas -->
        <div id="gameContainer" class="hidden mt-6 relative">
          <div id="pingDisplay" class="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono border border-purple-500/30">Ping: -- ms</div>

          <div class="absolute top-4 left-4 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-blue-500/50">
            <div class="text-2xl font-mono font-bold"><span class="text-blue-400">P1</span> <span id="scoreP1">0</span></div>
          </div>
          <div class="absolute top-4 right-24 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-red-500/50">
            <div class="text-2xl font-mono font-bold"><span id="scoreP2">0</span> <span class="text-red-400">P2</span></div>
          </div>

          <div id="countdownDisplay" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-6xl font-bold text-yellow-400"></div>
          <div id="hudText" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-mono border border-purple-500/30"></div>

          <div class="mx-auto" style="width:1000px;max-width:100%;">
            <canvas id="gameCanvas" tabindex="0" width="1000" height="600" class="bg-black block w-full h-auto"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;

  // connect to lobby ws after mount
  if (!didMountRemoteRoom) {
    setTimeout(() => connectToRoom(root, roomId, playerId, username), 0);
    didMountRemoteRoom = true;
  }
  setupRoomEventListeners(root);

  // invites / player-left
  const onInviteDeclined = (e: Event) => {
    if (!gameState) return;
    const detail: any = (e as CustomEvent).detail || {};
    updateStatus(root, `❌ ${detail?.from || "Player"} declined your invitation`, "error");
    setTimeout(() => navigate("/remote"), 1500);
  };
  window.addEventListener("invite:declined", onInviteDeclined as EventListener);

  const onPlayerLeft = (e: Event) => {
    if (!gameState) return;
    const detail: any = (e as CustomEvent).detail || {};
    updateStatus(root, `👋 ${detail?.from || "Player"} left the waiting room`, "error");
    setTimeout(() => navigate("/remote"), 1500);
  };
  window.addEventListener("player:left", onPlayerLeft as EventListener);

  // Cleanup for router unmount
  return () => {
    try {
      if (gameState?.ws) {
        const s = gameState.ws;
        (gameState as any).ws = null;
        if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
          s.close();
        }
      }
    } catch {}
    try { sceneController?.dispose(); } catch {}
    sceneController = null;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    lastRenderState = null;
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    window.removeEventListener("invite:declined", onInviteDeclined as EventListener);
    window.removeEventListener("player:left", onPlayerLeft as EventListener);
    gameState = null;
    didMountRemoteRoom = false;
    isConnectingRemoteRoom = false;
    isTransitioningToCentral = false;
  };
}

/* ---------- Setup event listeners ---------- */
function setupRoomEventListeners(root: HTMLElement) {
  root.querySelector("#leaveRoom")?.addEventListener("click", () => {
    if (confirm("Leave this game?")) {
      try { gameState?.ws?.send(JSON.stringify({ type: "leave" })); } catch {}
      try { gameState?.ws?.close(); } catch {}
      navigate("/remote");
    }
  });

  root.querySelector("#copyCode")?.addEventListener("click", () => {
    if (gameState?.roomId) {
      navigator.clipboard.writeText(gameState.roomId).then(() => updateStatus(root, "✅ Room code copied!", "success"));
    }
  });

  root.querySelector("#readyBtn")?.addEventListener("click", async () => {
    const btn = document.querySelector<HTMLButtonElement>("#readyBtn")!;
    if (!gameState?.connected) {
      updateStatus(root, "⚠️ Not connected", "error");
      return;
    }
    if (!gameState.serverIdReady) {
      updateStatus(root, "Syncing with server…", "info");
      setTimeout(() => refreshReadyButtonState(root), 100);
      return;
    }
    try {
      const ws = gameState.ws;
      // Lobby ready message is simple (server handles mapping)
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ready" }));
      } else {
        // HTTP fallback
        const uname = (getAuth()?.name) || (getState().session.alias) || "Anonymous";
        await httpFallbackReady(root, uname);
      }
      btn.disabled = true;
      btn.textContent = "⏳ Waiting for opponent...";
    } catch (e) {
      console.error("Failed to send ready", e);
    }
  });

  // Keyboard handlers
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  // Focus & visibility handling for ping
  document.addEventListener("visibilitychange", () => {
    try { const ae = document.activeElement as HTMLElement | null; if (ae && ae !== canvas) ae.blur(); (canvas as any)?.focus?.(); } catch {}
    updateDiagnostics(document.body as HTMLElement);
    if (document.visibilityState === "hidden") {
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    } else {
      if (!pingTimer && gameState?.ws) {
        pingTimer = window.setInterval(() => {
          try { lastPingTs = Date.now(); gameState?.ws?.send(JSON.stringify({ type: "ping", ts: lastPingTs })); } catch {}
        }, 3000);
      }
    }
  });
}

/* ---------- HTTP fallback - mark ready via REST ---------- */
async function httpFallbackReady(root: HTMLElement, uname: string) {
  try {
    if (!gameState) return;
    const { roomId, playerId, wsConnectedRoomId, playerNumber } = gameState as any;
    const rid = wsConnectedRoomId || roomId;
    const res = await fetch(`/api/game/rooms/${encodeURIComponent(rid)}/players/${encodeURIComponent(playerId)}/ready`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: uname, playerNumber })
    });
    if (!res.ok) {
      console.warn("HTTP fallback ready failed", res.status);
      updateStatus(root, "⚠️ Ready fallback failed", "error");
      return;
    }
    updateStatus(root, "✅ Ready (fallback)", "success");
  } catch (err) {
    console.error("HTTP fallback error", err);
    updateStatus(root, "❌ Ready fallback error", "error");
  }
}

/* ---------- Connect to lobby websocket (/ws/remote) ---------- */
function connectToRoom(root: HTMLElement, roomId: string, playerId: string, username: string) {
  try {
    if (gameState?.ws) {
      try { gameState.ws.onopen = gameState.ws.onmessage = gameState.ws.onclose = gameState.ws.onerror = null as any; } catch {}
      try { gameState.ws.close(); } catch {}
    }
  } catch {}

  const wsUrl = `${WS_BASE}/remote?roomId=${roomId}&playerId=${playerId}&username=${encodeURIComponent(username)}`;
  if (gameState) gameState.wsConnectedRoomId = roomId;
  updateStatus(root, "🔄 Connecting...", "info");

  const ws = new WebSocket(wsUrl);
  const thisConnId = ++connectionCounter;
  if (gameState) { gameState.ws = ws; (gameState as any).connectionId = thisConnId; gameState.connected = false; }

  ws.onopen = () => {
    if (!gameState || (gameState as any).connectionId !== thisConnId) return;
    gameState.connected = true;
    updateStatus(root, "✅ Connected to room!", "success");
    updateDiagnostics(root);
    refreshReadyButtonState(root);
  };

  ws.onmessage = async (event) => {
    if (!gameState || (gameState as any).connectionId !== thisConnId) return;
    try {
      let data = event.data;
      if (data instanceof Blob) data = await data.text();
      const message = JSON.parse(data);
      handleServerMessage(root, message);
    } catch (err) {
      console.error("Error parsing lobby message:", err);
    }
  };

  ws.onerror = (e) => {
    console.error("Lobby WS error", e);
    updateStatus(root, "❌ Connection error", "error");
  };

  ws.onclose = () => {
    if (!gameState) return;
    gameState.connected = false;

    if (!isTransitioningToCentral) {
      updateStatus(root, "⚠️ Disconnected", "error");
      refreshReadyButtonState(root);
    } else {
      console.log("[remote-room] lobby WS closed due to central transition");
    }
  };
}

/* ---------- Engine helpers ---------- */
/**
 * This function consumes central engine 'STATE_UPDATE' messages and also
 * detects tournament-style end states from the engine.
 */
function handleEngineStateUpdate(root: HTMLElement, msg: any, centralGameId?: number) {
  const state = msg.gameState ?? msg.state ?? null;
  if (!state) return;

  // Detect tournament game end coming from the game service
  if (state.tournament && state.tournament.gameStatus === "gameEnd") {
    // Avoid duplicate end calls
    if (gameState && !(gameState as any).centralGameEnded) {
      (gameState as any).centralGameEnded = true;
      const winner = state.tournament.winner; // "player1"/"player2" or numeric
      const finalScore = state.score || { player1: 0, player2: 0 };
      endGame(root, { winner, finalScore, gameId: centralGameId });
    }
  }

  // Update visuals
  updateGameState(root, {
    ball: state.ball,
    paddles: state.paddles,
    score: state.score
  });
}

/* ---------- Connect to central engine websocket ---------- */
function connectToCentralGame(root: HTMLElement, websocketUrl: string, centralGameId: number) {
  // Close existing ws (lobby) cleanly
  try {
    if (gameState?.ws) {
      try { gameState.ws.onopen = gameState.ws.onmessage = gameState.ws.onclose = gameState.ws.onerror = null as any; } catch {}
      try { gameState.ws.close(); } catch {}
    }
  } catch {}

  const ws = new WebSocket(websocketUrl);

  if (gameState) {
    gameState.ws = ws;
    gameState.centralGameId = centralGameId;
    gameState.centralWsUrl = websocketUrl;
    gameState.connected = false;
    gameState.centralStartSent = false;
    gameState.centralGameEnded = false;
  }

  ws.onopen = () => {
    console.log("[Central WS] connected", websocketUrl);
    if (!gameState) return;
    gameState.connected = true;

    // Start ping to central
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    pingTimer = window.setInterval(() => {
      try { lastPingTs = Date.now(); gameState?.ws?.send(JSON.stringify({ type: "ping", ts: lastPingTs })); } catch {}
    }, 3000);

    // Determine numeric user id (prefer getAuth)
    let numericUserId: number | null = null;
    try {
      const authUser = getAuth();
      if (authUser && typeof authUser.id === "number") {
        numericUserId = authUser.id;
      } else {
        const m = (gameState?.playerId || "").match(/^(\d+)_/);
        numericUserId = (m && m[1]) ? parseInt(m[1], 10) : null;
      }
    } catch (e) {
      numericUserId = null;
    }

    // Determine slot using server-assigned playerNumber
    const slot = gameState?.playerNumber === 1 ? "player1" : (gameState?.playerNumber === 2 ? "player2" : null);

    // Send PLAYER_READY with both player and player_id if available
    const readyMsg: any = { type: "PLAYER_READY" };
    if (numericUserId) readyMsg.player_id = numericUserId;
    if (slot) readyMsg.player = slot;

    console.log("[Central WS] sending PLAYER_READY ", readyMsg);
    try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(readyMsg)); }
    catch (err) { console.warn("[Central WS] send PLAYER_READY failed", err); }
  };

  ws.onmessage = async (ev) => {
    try {
      let data = ev.data;
      if (data instanceof Blob) data = await data.text();
      const msg = JSON.parse(data);

      switch (String(msg.type)) {
        case "STATE_UPDATE":
          handleEngineStateUpdate(root, msg, centralGameId);
          break;

        case "GAME_STARTED":
        case "gameStarted":
          if (gameState) gameState.centralStartSent = false;
          startGameUI(root, msg.gameState || msg.initialState || {});
          break;

        case "GAME_END":
        case "gameEnd":
        case "GAME_ENDED": {
          if (gameState) gameState.centralStartSent = false;
          const normalized: any = {
            winner: msg.winner ?? msg.winnerPlayerNumber ?? msg.winnerPlayer,
            finalScore: msg.finalScores ?? msg.finalScore ?? msg.score,
            gameId: msg.gameId ?? centralGameId
          };
          endGame(root, normalized);
          break;
        }

        case "ERROR":
          updateStatus(root, msg.message || "Server error", "error");
          break;

        case "PLAYER_READY_UPDATE":
          try {
            // expected playersReady: { player1: boolean, player2: boolean }
            const playersReady = msg.playersReady ?? msg.state?.playersReady ?? null;
            const p1ready = !!playersReady?.player1;
            const p2ready = !!playersReady?.player2;

            if (p1ready && p2ready) {
              if (gameState && !gameState.centralStartSent) {
                console.log("[Central WS] Both players ready — sending START_GAME to central engine");
                try {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: "START_GAME" }));
                    if (gameState) gameState.centralStartSent = true;
                  }
                } catch (err) {
                  console.warn("[Central WS] Failed to send START_GAME", err);
                }
              } else {
                console.log("[Central WS] START_GAME already sent or gameState missing");
              }
            } else {
              console.log("[Central WS] PLAYER_READY_UPDATE shows not all ready", { p1ready, p2ready });
            }
          } catch (e) {
            console.error("[Central WS] Error handling PLAYER_READY_UPDATE", e);
          }
          break;

        case "pong":
          try {
            const now = Date.now();
            const rtt = msg.ts ? now - msg.ts : lastPingTs ? now - lastPingTs : null;
            const el = root.querySelector("#pingDisplay");
            if (el && rtt !== null) el.textContent = `Ping: ${rtt} ms`;
          } catch (e) {}
          break;

        default:
          console.debug("[Central WS] unhandled", msg);
      }
    } catch (err) {
      console.error("[Central WS] parse error", err);
    }
  };

  ws.onclose = () => {
    if (gameState) { gameState.centralStartSent = false; gameState.centralGameEnded = false; }
    updateStatus(root, "🔌 Central game disconnected", "error");
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  };

  ws.onerror = (e) => {
    console.error("[Central WS] error", e);
    updateStatus(root, "❌ Central WS error", "error");
  };
}

/* ---------- Lobby message handler (incl. startGame) ---------- */
function handleServerMessage(root: HTMLElement, message: any) {
  if (!gameState) return;
  if (!["gameState","hud","pong","startGame","init","playerJoined","playerReady","countdown","gameStart","gameEnd","playerDisconnected","error"].includes(message.type)) {
    console.log("📨", message.type);
  }

  switch (message.type) {
    case "pong":
      try {
        const now = Date.now();
        const rtt = lastPingTs && message.ts ? now - message.ts : lastPingTs ? now - lastPingTs : null;
        const el = root.querySelector("#pingDisplay");
        if (el) el.textContent = rtt !== null ? `Ping: ${rtt} ms` : "Ping: -- ms";
      } catch {}
      break;

    case "init":
      if (message.playerId && gameState?.playerId !== message.playerId) gameState!.playerId = message.playerId;
      if (gameState) {
        gameState.serverIdReady = !!message.playerId;
        gameState.playerNumber = message.playerNumber;
      }
      updateStatus(root, `You are Player ${message.playerNumber}`, "success");
      {
        if (message.roomInfo && typeof message.roomInfo.roomId === "string") {
          if (gameState) gameState.wsConnectedRoomId = message.roomInfo.roomId;
        }
        const serverPlayers = Array.isArray(message.roomInfo?.players) ? message.roomInfo.players : [];
        const dedupMap = new Map<string, any>();
        for (const p of serverPlayers) {
          const key = `${p.playerNumber}:${p.playerId}`;
          if (!dedupMap.has(key)) dedupMap.set(key, p);
        }
        let players = Array.from(dedupMap.values());
        const myPlayerId = gameState?.playerId;
        const hasSelf = players.some((p: any) => p.playerId === myPlayerId);
        if (!hasSelf && gameState) {
          players.push({ playerId: myPlayerId, playerNumber: message.playerNumber, username: "You", ready: false });
        }
        if (gameState) gameState.players = players;
      }
      updatePlayersList(root);
      setTimeout(() => refreshReadyButtonState(root), 0);
      break;

    case "playerJoined": {
      const idx = gameState!.players.findIndex(p => p.playerId === message.playerId);
      const newPlayer: RemotePlayer = { playerId: message.playerId, playerNumber: message.playerNumber, username: message.playerInfo.username, ready: false };
      if (idx >= 0) gameState!.players[idx] = newPlayer; else gameState!.players.push(newPlayer);
      updatePlayersList(root);
      updateStatus(root, `${message.playerInfo.username} joined!`, "info");
      refreshReadyButtonState(root);
      break;
    }

    case "playerReady": {
      const player = gameState!.players.find(p => p.playerId === message.playerId);
      if (player) { player.ready = true; updatePlayersList(root); }
      refreshReadyButtonState(root);
      break;
    }

    case "countdown":
      root.querySelector("#waitingRoom")?.classList.add("hidden");
      root.querySelector("#gameContainer")?.classList.remove("hidden");
      showCountdown(root, message.count);
      if (message.message) updateStatus(root, message.message, "info");
      break;

    case "startGame":
      console.log('[remote-room] startGame received from lobby:', message);
      if (gameState) {
        gameState.centralGameId = message.gameId;
        gameState.centralWsUrl = message.websocketUrl;
      }

      // Ensure playerNumber is set before connecting to central engine.
      if (!gameState || (gameState.playerNumber !== 1 && gameState.playerNumber !== 2)) {
        console.warn('[remote-room] missing playerNumber on startGame; delaying central connect');

        setTimeout(() => {
          if (gameState && (gameState.playerNumber === 1 || gameState.playerNumber === 2)) {
            console.log('[remote-room] playerNumber now available, connecting to central WS');
            isTransitioningToCentral = true;
            connectToCentralGame(root, message.websocketUrl, message.gameId);
          } else {
            console.error('[remote-room] Failed to determine player slot after retry; please reconnect');
            updateStatus(root, 'Failed to determine player slot — please reconnect', 'error');
          }
        }, 100);
        return;
      }

      isTransitioningToCentral = true;
      if (message.websocketUrl && message.gameId) {
        console.log('[remote-room] connecting to central WS:', message.websocketUrl);
        connectToCentralGame(root, message.websocketUrl, message.gameId);
      } else {
        console.warn('[remote-room] startGame missing websocketUrl or gameId:', message);
      }
      break;

    case "gameStart":
      startGameUI(root, message.gameState || {});
      inputGateUntil = Date.now() + 500;
      ignoreStateUntil = Date.now() + 300;
      break;

    case "gameState":
      updateGameState(root, message.state);
      break;

    case "hud":
      updateHud(root, message);
      break;

    case "gameEnd":
      endGame(root, message);
      break;

    case "playerDisconnected":
      if (isTransitioningToCentral) {
        console.log("[remote-room] playerDisconnected during central transition – ignoring");
        break;
      }
      updateStatus(root, "⚠️ Opponent disconnected", "error");
      setTimeout(() => { if (confirm("Opponent left. Return to remote lobby?")) navigate("/remote"); }, 2000);
      break;

    case "error":
      updateStatus(root, `❌ ${message.message}`, "error");
      break;
  }
}

/* ---------- UI helpers ---------- */
function updatePlayersList(root: HTMLElement) {
  if (!gameState) return;
  const container = root.querySelector("#playersList")!;
  const players = [...gameState.players].sort((a,b) => a.playerNumber - b.playerNumber);
  container.innerHTML = players.map(p => `
    <div class="player-card">
      <div class="player-badge ${p.playerNumber === 1 ? 'bg-blue-600' : 'bg-red-600'}">P${p.playerNumber}</div>
      <div class="flex-1">
        <div class="font-black text-indigo-100">${p.username}</div>
        ${p.playerId === gameState?.playerId ? '<div class="chip text-[11px] text-indigo-200/90">YOU</div>' : ''}
      </div>
      ${p.ready ? '<div class="status-ready text-sm"><span class="status-dot" style="background:#4ade80;"></span>READY</div>' : '<div class="status-wait text-sm"><span class="status-dot" style="background:#94a3b8;"></span>WAITING</div>'}
    </div>
  `).join('');
}

function showCountdown(root: HTMLElement, count: number) {
  const display = root.querySelector("#countdownDisplay") as HTMLElement | null;
  if (!display) return;
  display.textContent = count > 0 ? String(count) : "GO!";
  if (count === 0) setTimeout(() => { const d = root.querySelector("#countdownDisplay") as HTMLElement | null; if (d) d.textContent = ''; }, 1000);
}

function refreshReadyButtonState(root: HTMLElement) {
  if (!gameState) return;
  const gs = gameState;
  const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
  if (!btn) return;

  const wsOpen = isWsOpen();
  if (wsOpen && !gs.serverIdReady && (!gs.players || gs.players.length === 0)) {
    updateStatus(root, '🔄 Syncing with server…', 'info');
    setTimeout(() => refreshReadyButtonState(root), 150);
    btn.disabled = true;
    btn.textContent = '⏳ Waiting for opponent...';
    return;
  }

  const p1 = gs.players.find(p => p.playerNumber === 1);
  const p2 = gs.players.find(p => p.playerNumber === 2);
  const twoRolesAssigned = !!p1 && !!p2;
  const me = gs.players.find(p => p.playerId === gs.playerId) || null;
  const meNotReady = me ? !me.ready : true;
  const enable = twoRolesAssigned && wsOpen && meNotReady && !gs.gameStarted && !!gs.serverIdReady;
  btn.disabled = !enable;
  btn.textContent = enable ? '✅ Ready!' : '⏳ Waiting for opponent...';
  btn.classList.toggle('bg-yellow-500', enable);
  btn.classList.toggle('bg-gray-300', !enable);
}

/* ---------- Game UI & rendering ---------- */
function startGameUI(root: HTMLElement, initialState: any) {
  if (!gameState) return;
  gameState.gameStarted = true;
  root.querySelector('#waitingRoom')?.classList.add('hidden');
  root.querySelector('#gameContainer')?.classList.remove('hidden');
  canvas = root.querySelector('#gameCanvas') as HTMLCanvasElement;
  try { canvas.width = canvas.clientWidth || 1000; canvas.height = canvas.clientHeight || 600; (canvas as any)?.focus?.(); } catch {}
  try {
    sceneController = createLocalScene(canvas) as any;
    const tick = () => {
      if (!sceneController) return;
      if (lastRenderState) {
        try { sceneController.update(lastRenderState); } catch {}
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  } catch (e) {
    ctx = canvas.getContext('2d')!;
  }

  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  pingTimer = window.setInterval(() => {
    try { lastPingTs = Date.now(); gameState?.ws?.send(JSON.stringify({ type: 'ping', ts: lastPingTs })); } catch {}
  }, 3000);

  updateStatus(root, '🎮 Game started!', 'success');
}

/* ---------- Update & draw ---------- */
function updateGameState(root: HTMLElement, state: any) {
  if (!gameState) return;
  gameState.score = state.score ?? gameState.score;
  updateScoreDisplay(root);

  if (sceneController && typeof sceneController.update === 'function') {
    try {
      const effectiveBall = (Date.now() < ignoreStateUntil) ? { x: 0, y: 0 } : { x: state.ball?.x ?? 0, y: state.ball?.y ?? 0 };
      const effectiveP1 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player1 ?? 0);
      const effectiveP2 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player2 ?? 0);
      const renderState = {
        ball: effectiveBall,
        paddles: { player1: effectiveP1, player2: effectiveP2 },
        score: { player1: state.score?.player1 ?? 0, player2: state.score?.player2 ?? 0 },
        match: { roundsWon: { player1: 0, player2: 0 }, winner: null, currentRound: 1 },
        gameStatus: 'playing'
      };
      lastRenderState = renderState;
      try { sceneController.update(renderState as any); } catch {}
      return;
    } catch (e) {
      console.warn('Babylon update error', e);
    }
  }
  drawGame(state);
}

function drawGame(state: any) {
  if (!ctx || !canvas) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = '#333';
  ctx.setLineDash([15,15]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width/2,0);
  ctx.lineTo(canvas.width/2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);

  const paddleWidth = 15, paddleHeight = 100, paddleOffset = 40;
  ctx.fillStyle = '#3b82f6';
  const p1Y = canvas.height/2 - state.paddles.player1;
  ctx.fillRect(paddleOffset, p1Y - paddleHeight/2, paddleWidth, paddleHeight);

  ctx.fillStyle = '#ef4444';
  const p2Y = canvas.height/2 - state.paddles.player2;
  ctx.fillRect(canvas.width - paddleOffset - paddleWidth, p2Y - paddleHeight/2, paddleWidth, paddleHeight);

  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#fff';
  ctx.beginPath();
  ctx.arc(canvas.width/2 + state.ball.x, canvas.height/2 - state.ball.y, 12, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/* ---------- Input handlers: send MOVE_PADDLE to central WS ---------- */
function handleKeyDown(e: KeyboardEvent) {
  if (!gameState?.ws || gameState.ws.readyState !== WebSocket.OPEN) { console.warn('WS not open'); return; }
  if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) { console.warn('No role assigned'); return; }

  const isUp = e.key === 'w' || e.key === 'W';
  const isDown = e.key === 's' || e.key === 'S';
  const now = Date.now();

  const sendMove = (dir: 'up'|'down'|'stop') => {
    const playerSlot = gameState!.playerNumber === 1 ? 'player1' : 'player2';
    try { gameState!.ws!.send(JSON.stringify({ type: 'MOVE_PADDLE', player: playerSlot, direction: dir })); }
    catch (err) { console.warn('Failed to send MOVE_PADDLE', err); }
  };

  if (isUp && !keysPressed.has('up')) {
    keysPressed.add('up');
    if (now >= inputGateUntil) sendMove('up');
    e.preventDefault(); e.stopPropagation();
  } else if (isDown && !keysPressed.has('down')) {
    keysPressed.add('down');
    if (now >= inputGateUntil) sendMove('down');
    e.preventDefault(); e.stopPropagation();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (!gameState?.ws) { console.warn('No ws'); return; }
  if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) { console.warn('No role'); return; }
  const isHandled = e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S';
  if (!isHandled) return;
  const wasUp = keysPressed.has('up'); const wasDown = keysPressed.has('down');
  if (wasUp) keysPressed.delete('up'); if (wasDown) keysPressed.delete('down');
  if (!keysPressed.has('up') && !keysPressed.has('down')) {
    const playerSlot = gameState.playerNumber === 1 ? 'player1' : 'player2';
    try { gameState.ws!.send(JSON.stringify({ type: 'MOVE_PADDLE', player: playerSlot, direction: 'stop' })); } catch {}
  }
  e.preventDefault(); e.stopPropagation();
}

/* ---------- Score / HUD ---------- */
function updateScoreDisplay(root: HTMLElement) {
  if (!gameState) return;
  root.querySelector('#scoreP1')!.textContent = String(gameState.score.player1);
  root.querySelector('#scoreP2')!.textContent = String(gameState.score.player2);
}

function updateHud(root: HTMLElement, hud: any) {
  try {
    const hudEl = root.querySelector('#hudText') as HTMLElement | null;
    if (hudEl) hudEl.textContent = `Round ${hud.currentRound}/3 | P1 ${hud.roundsWon.player1} - P2 ${hud.roundsWon.player2} | to ${hud.scoreLimit}`;
  } catch {}
}

/* ---------- End game & report finish ---------- */
function endGame(root: HTMLElement, data: any) {
  if (!gameState) return;

  // reset central flags and transition state
  if (gameState) {
    gameState.centralStartSent = false;
    gameState.centralGameEnded = true;
    gameState.centralGameId = null;
    gameState.centralWsUrl = null;
    isTransitioningToCentral = false;
  }

  gameState.gameStarted = false;
  const winner = data.winner;
  const isYouWinner = winner === gameState.playerNumber;

  reportRemoteMatchFinish(data).catch(err => console.error("[Remote] report failed", err));

  const display = root.querySelector('#countdownDisplay') as HTMLElement | null;
  if (display) {
    display.textContent = isYouWinner ? '🏆 YOU WON! 🏆' : `Player ${winner} Won!`;
    display.style.display = 'block';
    display.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-5xl font-bold ' + (isYouWinner ? 'text-green-400' : 'text-yellow-400');
  }

  updateStatus(root, isYouWinner ? '🎉🏆 YOU WON! 🏆🎉' : `Player ${winner} won!`, isYouWinner ? 'success' : 'info');
  setTimeout(() => navigate('/remote'), 3000);
}

function updateStatus(root: HTMLElement, message: string, type: 'info'|'success'|'error') {
  const box = root.querySelector('#statusBox') as HTMLElement | null;
  const text = root.querySelector('#statusText') as HTMLElement | null;
  if (!box || !text) return;
  box.className = `rounded border-2 p-4 ${type === 'success' ? 'bg-green-50 border-green-400' : type === 'error' ? 'bg-red-50 border-red-400' : 'bg-blue-50 border-blue-400'}`;
  text.className = `font-semibold ${type === 'success' ? 'text-green-900' : type === 'error' ? 'text-red-900' : 'text-blue-900'}`;
  text.textContent = message;
}

/* ---------- Report finish to backend ---------- */
async function reportRemoteMatchFinish(data: any) {
  try {
    if (!gameState) return;
    const finalScore = data.finalScore || data.finalScores || gameState.score;
    const p1 = finalScore?.player1 ?? gameState.score.player1;
    const p2 = finalScore?.player2 ?? gameState.score.player2;

    let winnerStr: 'player1'|'player2';
    if (data.winner === 1 || data.winner === 'player1') winnerStr = 'player1';
    else if (data.winner === 2 || data.winner === 'player2') winnerStr = 'player2';
    else { console.warn('Unknown winner', data.winner); return; }

    const gameId = data.gameId ?? gameState.centralGameId ?? null;
    if (!gameId) { console.warn('No gameId to report'); return; }

    const res = await fetch('/api/game/remote/match/finish', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, winner: winnerStr, finalScore: { player1: p1, player2: p2 } })
    });
    if (!res.ok) { console.warn('finish endpoint failed', res.status); return; }
    const json = await res.json().catch(() => null);
    console.log('Remote match recorded:', json);
  } catch (err) {
    console.error('reportRemoteMatchFinish error', err);
  }
}

/* ---------- Diagnostics ---------- */
function updateDiagnostics(root: HTMLElement) {
  try {
    const pingEl = root.querySelector('#pingDisplay') as HTMLElement | null;
    if (pingEl) {
      if (lastPingTs && gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const rtt = lastPingTs ? (now - lastPingTs) : null;
        pingEl.textContent = rtt !== null ? `Ping: ${rtt} ms` : 'Ping: -- ms';
      } else {
        pingEl.textContent = 'Ping: -- ms';
      }
    }
    const roleEl = root.querySelector('#yourRole') as HTMLElement | null;
    if (roleEl && gameState) {
      roleEl.textContent = gameState.playerNumber ? `Player ${gameState.playerNumber}` : 'Player ?';
    }
  } catch (err) {
    console.debug('updateDiagnostics error', err);
  }
}
