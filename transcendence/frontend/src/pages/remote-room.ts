// frontend/src/pages/remote-room.ts

import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { WS_BASE } from "@/app/config";
import { createLocalScene } from "@/renderers/babylon/local-scene";

interface RemoteGameState {
	roomId: string;
	playerId: string;
	playerNumber: number | null;
	ws: WebSocket | null;
	connected: boolean;
	serverIdReady: boolean;
	wsConnectedRoomId?: string;
	gameStarted: boolean;
	score: { player1: number; player2: number };
	players: Array<{ playerId: string; playerNumber: number; username: string; ready: boolean }>;
}

let gameState: RemoteGameState | null = null;
// track open state helper
function isWsOpen() {
	// In some browsers/proxies readyState may briefly report CONNECTING during init dispatch;
	// prefer our own connected flag once onopen fired.
	return !!gameState?.connected;
}
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let keysPressed: Set<string> = new Set();
let moveRepeatTimer: number | null = null; // will be removed (no repeat) but keep variable for cleanup safety
let pingTimer: number | null = null;
let lastPingTs: number | null = null;
// Babylon scene controller (from createLocalScene)
let sceneController: { update: (state: any) => void; dispose: () => void } | null = null;
// Keep last server-render state to drive a steady RAF render loop
let lastRenderState: any | null = null;
let rafId: number | null = null;
// Local gates
let inputGateUntil: number = 0; // timestamp until which inputs are gated
let ignoreStateUntil: number = 0; // timestamp until which gameState updates won't move paddles/ball

// Global mount/connect guards to prevent duplicate WS connections on re-mounts
let didMountRemoteRoom = false;
let isConnectingRemoteRoom = false;
let connectionCounter = 0; // monotonically increasing id for ws connections

export default function (root: HTMLElement, ctx: { params?: { roomId?: string }; url: URL }) {
	// Get roomId from router params (which includes query parameters)
	let roomId = ctx.params?.roomId ?? '';
	
	// Fallback: If not found in params, try URL query parameters directly
	if (!roomId && ctx.url) {
		roomId = ctx.url.searchParams.get('roomId') ?? '';
	}
	
	console.log('🎮 Remote Room - roomId extracted:', roomId);
	console.log('🎮 Remote Room - ctx.params:', ctx.params);
	console.log('🎮 Remote Room - ctx.url.search:', ctx.url?.search);

	if (!roomId) {
		console.log('🎮 Remote Room - No roomId found, redirecting to /remote');
		navigate('/remote');
		return () => { };
	}

	const user = getAuth();
	const state = getState();
	// Generate a playerId once per page instance; prevent accidental duplicates on remounts
	// If the server later echoes/assigns a canonical playerId, we will switch to it.
	const playerId = `${user?.id ?? 'guest'}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
	const username = user?.name || state.session.alias || 'Anonymous';

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
		players: []
	};

	// Prevent duplicate mount/connect
	if (didMountRemoteRoom || isConnectingRemoteRoom) {
		console.warn('⚠️ Remote room already mounted/connecting, skipping duplicate setup');
	} else {
		isConnectingRemoteRoom = true;
	}

	root.innerHTML = `
    <section class="retro-wait py-6 md:py-8 space-y-6 max-w-6xl mx-auto px-4">
      <div class="crt-scan vignette bezel rounded-2xl p-5 md:p-6 border border-purple-500/30">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl sm:text-3xl font-black neon">WAITING ROOM</h1>
          <button id="leaveRoom" 
            class="btn-retro px-4 py-2 rounded-lg text-white">
            ⏎ LEAVE
          </button>
        </div>

        <!-- Status -->
        <div id="statusBox" class="mt-4 rounded-lg p-4 border border-purple-400/40 bg-purple-900/20">
          <p id="statusText" class="font-black neon-soft">Connecting...</p>
        </div>

        <!-- Waiting Room -->
        <div id="waitingRoom" class="mt-6 rounded-xl p-6 space-y-5 bezel border border-purple-500/30 bg-black/30">
          <!-- Share Room Code -->
          <div class="p-4 rounded-lg border border-indigo-400/40 bg-indigo-900/10">
            <p class="text-xs text-indigo-200/80 mb-2">ROOM CODE</p>
            <div class="flex flex-wrap items-center gap-3">
              <code class="text-2xl code-chip font-black text-indigo-200 tracking-widest">${roomId}</code>
              <button id="copyCode" class="btn-retro px-3 py-2 rounded-lg text-white text-sm">
                📋 COPY
              </button>
            </div>
            <p class="text-[11px] text-indigo-300/70 mt-2">Share this code with your friend</p>
          </div>
          
          <!-- Game Info -->
          <div class="p-3 rounded-lg border border-yellow-400/40 bg-yellow-900/10 mb-4">
            <p class="text-xs text-yellow-200/80 mb-1">MATCH FORMAT</p>
            <p class="text-sm text-yellow-100 font-bold">Best of 3 Rounds • First to 5 Points per Round</p>
          </div>

          <h2 class="text-xl font-black neon mt-2">PLAYERS <span class="blink"></span></h2>

          <!-- Players List -->
          <div class="space-y-2">
            <div id="playersList" class="space-y-2"></div>
          </div>

          <!-- Ready Button -->
          <button id="readyBtn" disabled
            class="btn-retro w-full px-4 py-4 rounded-lg text-indigo-50 font-black text-lg disabled:opacity-60">
            ⏳ Waiting for opponent...
          </button>
        </div>

        <!-- Game Canvas -->
        <div id="gameContainer" class="hidden mt-6 relative">
          <!-- Ping Display - Upper Right Corner -->
          <div id="pingDisplay" class="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono border border-purple-500/30">
            Ping: -- ms
          </div>
          
          <!-- Player Scores - Top Corners -->
          <div class="absolute top-4 left-4 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-blue-500/50">
            <div class="text-2xl font-mono font-bold">
              <span class="text-blue-400">P1</span> <span id="scoreP1">0</span>
            </div>
          </div>
          
          <div class="absolute top-4 right-24 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-red-500/50">
            <div class="text-2xl font-mono font-bold">
              <span id="scoreP2">0</span> <span class="text-red-400">P2</span>
            </div>
          </div>
          
          <!-- Countdown Display - Center -->
          <div id="countdownDisplay" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-6xl font-bold text-yellow-400"></div>
          
          <!-- HUD Text - Top Center (Round info) -->
          <div id="hudText" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-mono border border-purple-500/30"></div>
          
          <!-- Game Canvas -->
          <div class="mx-auto" style="width: 1000px; max-width: 100%;">
            <canvas id="gameCanvas" tabindex="0" width="1000" height="600" class="bg-black block w-full h-auto"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;

	// Only connect once - defer to avoid overlap with previous route teardown
	if (!didMountRemoteRoom) {
		setTimeout(() => {
			connectToRoom(root, roomId, playerId, username);
		}, 0);
		didMountRemoteRoom = true;
	}
	setupRoomEventListeners(root);

	// Listen for invite declined to automatically exit waiting room
	const onInviteDeclined = (e: Event) => {
		if (!gameState) return; // ignore if not active
		const detail: any = (e as CustomEvent).detail || {};
		console.log('🔔 Invite declined in remote-room:', detail);
		updateStatus(root, `❌ ${detail?.from || 'Player'} declined your invitation`, 'error');
		// Automatically navigate back to remote lobby after 1.5 seconds
		setTimeout(() => {
			navigate('/remote');
		}, 1500);
	};
	window.addEventListener('invite:declined', onInviteDeclined as EventListener);

	// Listen for player left to automatically exit waiting room
	const onPlayerLeft = (e: Event) => {
		if (!gameState) return; // ignore if not active
		const detail: any = (e as CustomEvent).detail || {};
		console.log('🔔 Player left in remote-room:', detail);
		updateStatus(root, `👋 ${detail?.from || 'Player'} left the waiting room`, 'error');
		// Automatically navigate back to remote lobby after 1.5 seconds
		setTimeout(() => {
			navigate('/remote');
		}, 1500);
	};
	window.addEventListener('player:left', onPlayerLeft as EventListener);

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
	window.removeEventListener('keydown', handleKeyDown);
	window.removeEventListener('keyup', handleKeyUp);
	if (moveRepeatTimer) { clearInterval(moveRepeatTimer); moveRepeatTimer = null; }
	if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
	window.removeEventListener('invite:declined', onInviteDeclined as EventListener);
	window.removeEventListener('player:left', onPlayerLeft as EventListener);
	gameState = null;
	didMountRemoteRoom = false;
	isConnectingRemoteRoom = false;
	};
	}

function setupRoomEventListeners(root: HTMLElement) {
	root.querySelector('#leaveRoom')?.addEventListener('click', () => {
		if (confirm('Leave this game?')) {
			if (gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
				try { gameState.ws.send(JSON.stringify({ type: 'leave' })); } catch {}
			}
			try { gameState?.ws?.close(); } catch {}
			navigate('/remote');
		}
	});

	root.querySelector('#copyCode')?.addEventListener('click', () => {
		const roomId = gameState?.roomId;
		if (roomId) {
			navigator.clipboard.writeText(roomId).then(() => {
				updateStatus(root, '✅ Room code copied!', 'success');
			});
		}
	});

	root.querySelector('#readyBtn')?.addEventListener('click', () => {
		const btn = root.querySelector<HTMLButtonElement>('#readyBtn')!;
		const ws = gameState?.ws || null;
		console.log('🖱️ Ready clicked by', gameState?.playerId, 'ws state=', ws?.readyState);
		if (!gameState?.connected) {
			console.warn('⚠️ Not connected, cannot send ready');
			return;
		}
		if (!gameState.serverIdReady) {
			console.warn('⚠️ Server playerId not synced yet; delaying ready');
			updateStatus(root, 'Syncing with server, please try again…', 'info');
			setTimeout(() => refreshReadyButtonState(root), 100);
			return;
		}
		try {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'ready' }));
				//console.log('📨 Sent ready message (immediate)');
			} else {
				// Fallback: slight delay, give ws a moment if reference swapped during init
				const uname = (getAuth()?.name) || (getState().session.alias) || 'Anonymous';
				setTimeout(() => {
					const w2 = gameState?.ws;
					if (w2 && w2.readyState === WebSocket.OPEN) {
						w2.send(JSON.stringify({ type: 'ready' }));
						console.log('📨 Sent ready message (delayed)');
					} else {
						console.warn('⚠️ WS still not open after delay, attempting HTTP fallback');
						httpFallbackReady(root, uname).catch(err => console.error('❌ HTTP fallback failed:', err));
					}
				}, 50);
			}
			btn.disabled = true;
			btn.textContent = '⏳ Waiting for opponent...';
			btn.classList.add('bg-gray-400');
		} catch (e) {
			console.error('❌ Failed to send ready:', e);
		}
	});

async function httpFallbackReady(root: HTMLElement, uname: string) {
	try {
		if (!gameState) return;
		const { roomId, playerId, wsConnectedRoomId, playerNumber } = gameState as any;
		const rid = wsConnectedRoomId || roomId;
		console.log('🌐 HTTP fallback Ready', { rid, playerId, playerNumber, username: uname });
		const res = await fetch(`/api/game/rooms/${encodeURIComponent(rid)}/players/${encodeURIComponent(playerId)}/ready`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: uname, playerNumber })
		});
		if (!res.ok) {
			console.warn('⚠️ HTTP fallback ready failed with status', res.status);
			updateStatus(root, '⚠️ Ready fallback failed', 'error');
			return;
		}
		console.log('✅ HTTP fallback ready succeeded');
	} catch (err) {
		console.error('❌ HTTP fallback error', err);
		updateStatus(root, '❌ Ready fallback error', 'error');
	}
}

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);
	// Force-focus on any click to ensure canvas captures keys
	window.addEventListener('click', () => {
	try {
	const c = document.getElementById('gameCanvas') as any;
	const ae = document.activeElement as HTMLElement | null;
	if (ae && ae !== c) ae.blur();
	c?.focus?.();
	} catch {}
	}, true);
	// Early capture on document for WS keys to avoid other handlers stealing focus (second window)
	document.addEventListener('keydown', (e: KeyboardEvent) => {
	const k = e.key;
	if (k === 'w' || k === 'W' || k === 's' || k === 'S') {
	e.preventDefault();
	e.stopPropagation();
	handleKeyDown(e);
	}
	}, true);
	document.addEventListener('keyup', (e: KeyboardEvent) => {
	const k = e.key;
	if (k === 'w' || k === 'W' || k === 's' || k === 'S') {
	e.preventDefault();
	e.stopPropagation();
	handleKeyUp(e);
	}
	}, true);
	// Auto-focus canvas and manage timers on visibility change
	window.addEventListener('visibilitychange', () => {
	try {
	// Blur any active element that is not our canvas to ensure keys go to canvas
	const ae = document.activeElement as HTMLElement | null;
	if (ae && ae !== canvas) ae.blur();
	(canvas as any).focus?.();
	} catch {}
	updateDiagnostics(root);
	if (document.visibilityState === 'hidden') {
	if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
	} else if (document.visibilityState === 'visible') {
	if (!pingTimer && gameState?.ws) {
	const ws = gameState.ws;
	pingTimer = window.setInterval(() => {
	try { lastPingTs = Date.now(); ws.send(JSON.stringify({ type: 'ping', ts: lastPingTs })); } catch {}
	}, 3000);
	}
	}
	});
}

function connectToRoom(root: HTMLElement, roomId: string, playerId: string, username: string) {
	// Always close any existing socket and open a fresh one for this tab
	try {
		if (gameState?.ws) {
			try { gameState.ws.onopen = gameState.ws.onmessage = gameState.ws.onclose = gameState.ws.onerror = null as any; } catch {}
			try { gameState.ws.close(); } catch {}
		}
	} catch {}

	const wsUrl = `${WS_BASE}/remote?roomId=${roomId}&playerId=${playerId}&username=${encodeURIComponent(username)}`;
	if (gameState) gameState.wsConnectedRoomId = roomId;
	console.log('🔗 WS connect params', { roomIdUsed: roomId, playerIdUsed: playerId });
	console.log('🪪 Identity', { localPlayerId: playerId, username });

	console.log('🔌 Connecting:', wsUrl);
	updateStatus(root, '🔄 Connecting...', 'info');

	const ws = new WebSocket(wsUrl);
	const thisConnId = ++connectionCounter;
	if (gameState) { gameState.ws = ws; (gameState as any).connectionId = thisConnId; gameState.connected = false; }
	(document as any)._lastWS = ws;
	isConnectingRemoteRoom = false;

	ws.onopen = () => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return; // stale
		console.log('✅ Connected');
		gameState.connected = true;
		(document as any)._lastWS = ws;
		updateStatus(root, '✅ Connected to room!', 'success');
		updateDiagnostics(root);
		refreshReadyButtonState(root);
	};

	ws.onmessage = async (event) => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return; // stale
		try {
			let data = event.data;
			if (data instanceof Blob) data = await data.text();
			const message = JSON.parse(data);
			if (gameState.ws !== ws) gameState.ws = ws;
			(document as any)._lastWS = ws;
			updateDiagnostics(root);
			handleServerMessage(root, message);
		} catch (err) {
			console.error('❌ Error parsing WebSocket message:', err, 'Raw data:', event.data);
		}
	};

	ws.onerror = () => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return; // stale
		updateStatus(root, '❌ Connection error', 'error');
	};

	ws.onclose = () => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return; // stale
		gameState.connected = false;
		updateStatus(root, '⚠️ Disconnected', 'error');
		updateDiagnostics(root);
		try {
			const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
			if (btn) {
				btn.disabled = true;
				btn.textContent = '⏳ Waiting for opponent...';
				btn.classList.add('bg-gray-300');
				btn.classList.remove('bg-yellow-500');
			}
		} catch {}
	};
}

function handleServerMessage(root: HTMLElement, message: any) {
	if (!gameState) return;

	// Only log important message types, not the spammy ones
	if (!['gameState', 'hud', 'pong'].includes(message.type)) {
		console.log('📨', message.type);
	}

	switch (message.type) {
        case 'pong':
            try {
                const now = Date.now();
                const rtt = (lastPingTs && message.ts) ? (now - message.ts) : (lastPingTs ? now - lastPingTs : null);
                if (rtt !== null) {
                    const el = root.querySelector('#pingDisplay');
                    if (el) el.textContent = `Ping: ${rtt} ms`;
                }
            } catch {}
            break;
		case 'init':
			// Prefer server authoritative identity if provided
			if (message.playerId && gameState.playerId !== message.playerId) {
				console.log('🪪 Updating local playerId from server', { old: gameState.playerId, new: message.playerId });
				gameState.playerId = message.playerId;
			}
			gameState.serverIdReady = !!message.playerId;
			gameState.playerNumber = message.playerNumber;
			updateStatus(root, `You are Player ${message.playerNumber}`, 'success');
			{
				// Adopt server-authoritative roomId if provided
				if (message.roomInfo && typeof message.roomInfo.roomId === 'string' && message.roomInfo.roomId) {
					gameState.wsConnectedRoomId = message.roomInfo.roomId;
					console.log('🔁 Adopted server roomId', message.roomInfo.roomId);
				}
				const serverPlayers = Array.isArray(message.roomInfo?.players) ? message.roomInfo.players : [];
				// Deduplicate by playerId and playerNumber to avoid double P2/P1 entries
				const dedupMap = new Map<string, any>();
				for (const p of serverPlayers) {
					const key = `${p.playerNumber}:${p.playerId}`;
					if (!dedupMap.has(key)) dedupMap.set(key, p);
				}
				let players = Array.from(dedupMap.values());
				// Ensure self is present exactly once
				const hasSelf = players.some((p: any) => p.playerId === gameState.playerId);
				if (!hasSelf) {
					players.push({
						playerId: gameState.playerId,
						playerNumber: message.playerNumber,
						username: 'You',
						ready: false,
					});
				}
				gameState.players = players;
			}
			updatePlayersList(root);
			// Re-evaluate ready state right after init processing
			setTimeout(() => refreshReadyButtonState(root), 0);
			break;

		case 'playerJoined':
			{
				const idx = gameState.players.findIndex(p => p.playerId === message.playerId);
				const newPlayer = {
					playerId: message.playerId,
					playerNumber: message.playerNumber,
					username: message.playerInfo.username,
					ready: false
				};
				if (idx >= 0) gameState.players[idx] = newPlayer; else gameState.players.push(newPlayer);
			}
			updatePlayersList(root);
			updateStatus(root, `${message.playerInfo.username} joined!`, 'info');
			refreshReadyButtonState(root);
			break;

		case 'playerReady':
			{
				const player = gameState.players.find(p => p.playerId === message.playerId);
				if (player) {
					player.ready = true;
					updatePlayersList(root);
				}
			}
			refreshReadyButtonState(root);
			break;

		case 'countdown':
			// Hide waiting room and show game container on first countdown
			root.querySelector('#waitingRoom')?.classList.add('hidden');
			root.querySelector('#gameContainer')?.classList.remove('hidden');
			showCountdown(root, message.count);
			// Show message if provided (for inter-round countdowns)
			if (message.message) {
				updateStatus(root, message.message, 'info');
			}
			break;

		case 'roundStart':
			// New round starting
			if (message.message) {
				updateStatus(root, message.message, 'success');
			}
			break;

		case 'gameStart':
			startGameUI(root, message.gameState);
			// Add a small grace window to let players react after GO!
			inputGateUntil = Date.now() + 500;
			ignoreStateUntil = Date.now() + 300; // allow HUD and scene init, delay motion a bit
			break;

		case 'gameState':
			updateGameState(root, message.state);
			break;
		case 'hud':
			updateHud(root, message);
			break;

		case 'gameEnd':
			endGame(root, message);
			break;

		case 'playerDisconnected':
			updateStatus(root, '⚠️ Opponent disconnected', 'error');
			setTimeout(() => {
				if (confirm('Opponent left. Return to remote lobby?')) {
					navigate('/remote');
				}
			}, 2000);
			break;

		case 'error':
			updateStatus(root, `❌ ${message.message}`, 'error');
			break;
	}
}

function updatePlayersList(root: HTMLElement) {
	if (!gameState) return;

	const container = root.querySelector('#playersList')!;
	// Sort by playerNumber for stable display
	const players = [...gameState.players].sort((a, b) => a.playerNumber - b.playerNumber);
	container.innerHTML = players.map(p => `
    <div class="player-card">
      <div class="player-badge ${p.playerNumber === 1 ? 'bg-blue-600' : 'bg-red-600'}">P${p.playerNumber}</div>
      <div class="flex-1">
        <div class="font-black text-indigo-100">${p.username}</div>
        ${p.playerId === gameState?.playerId ? '<div class="chip text-[11px] text-indigo-200/90">YOU</div>' : ''}
      </div>
      ${p.ready 
        ? '<div class="status-ready text-sm"><span class="status-dot" style="background:#4ade80; box-shadow:0 0 10px rgba(74,222,128,.8);"></span>READY</div>' 
        : '<div class="status-wait text-sm"><span class="status-dot" style="background:#94a3b8;"></span>WAITING</div>'}
    </div>
  `).join('');
}

function showCountdown(root: HTMLElement, count: number) {
	const display = root.querySelector('#countdownDisplay') as HTMLElement | null;
	if (!display) return;
	display.textContent = count > 0 ? count.toString() : 'GO!';
	if (count === 0) setTimeout(() => { const d = root.querySelector('#countdownDisplay') as HTMLElement | null; if (d) d.textContent = ''; }, 1000);
}

function refreshReadyButtonState(root: HTMLElement) {
	if (!gameState) return;
	const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
	if (!btn) return;
	
	const wsOpen = isWsOpen();
	
	// If WS is open but init hasn't arrived yet, show Syncing and retry shortly
	if (wsOpen && !gameState.serverIdReady && (!gameState.players || gameState.players.length === 0)) {
		updateStatus(root, '🔄 Syncing with server…', 'info');
		setTimeout(() => refreshReadyButtonState(root), 150);
		btn.disabled = true;
		btn.textContent = '⏳ Waiting for opponent...';
		return;
	}
	
	// Opponent presence: exactly one P1 and one P2 assigned by role
	const p1 = gameState.players.find(p => p.playerNumber === 1);
	const p2 = gameState.players.find(p => p.playerNumber === 2);
	const twoRolesAssigned = !!p1 && !!p2;
	// Identify self by server-authoritative playerId
	const me = gameState.players.find(p => p.playerId === gameState.playerId) || null;
	const meNotReady = me ? !me.ready : true; // if not in list yet, allow ready once connected
	const enable = twoRolesAssigned && wsOpen && meNotReady && !gameState.gameStarted && !!gameState.serverIdReady;
	btn.disabled = !enable;
	btn.textContent = enable ? '✅ Ready!' : '⏳ Waiting for opponent...';
	btn.classList.toggle('bg-yellow-500', enable);
	btn.classList.toggle('bg-gray-300', !enable);
	// Debug why disabled
	console.log('🧪 Ready gating', {
		wsOpen,
		twoRolesAssigned,
		me: me && { id: me.playerId, num: me.playerNumber, ready: me.ready },
		enable,
		players: gameState.players.map(p => ({ id: p.playerId, num: p.playerNumber, u: p.username, ready: p.ready }))
	});
}

function startGameUI(root: HTMLElement, initialState: any) {
if (!gameState) return;

gameState.gameStarted = true;
root.querySelector('#waitingRoom')?.classList.add('hidden');
root.querySelector('#gameContainer')?.classList.remove('hidden');
canvas = root.querySelector('#gameCanvas') as unknown as HTMLCanvasElement;
// Force canvas sizing to ensure Babylon has a real render surface
try {
  // Use the explicit container sizing to guide Babylon canvas size
  canvas.width = canvas.clientWidth || 1000;
  canvas.height = canvas.clientHeight || 600;
  try { (canvas as any).focus?.(); } catch {}
} catch {}
// Initialize Babylon scene using same renderer as local game
try {
console.log('🎥 Initializing Babylon on canvas', { w: canvas.width, h: canvas.height });
sceneController = createLocalScene(canvas) as any;
// Remote-only: pull camera back a bit so the scene appears further
try {
  const cam = (canvas as any).__babylonCamera;
  if (cam) {
    cam.radius = 20;
    cam.lowerRadiusLimit = 20;
    cam.upperRadiusLimit = 20;
    cam.fov = 0.46; // narrower vertical FOV to reduce top/bottom and emphasize width
    // Nudge target a bit lower to reveal more bottom area
    try {
      const BAB = (window as any).BABYLON;
      if (BAB?.Vector3 && cam.setTarget) cam.setTarget(new BAB.Vector3(0, -1.0, 0));
    } catch {}
  }
} catch {}
// Start a RAF loop to keep rendering smooth with last server state
const tick = () => {
  if (!sceneController) return;
  if (lastRenderState) {
    try { sceneController.update(lastRenderState); } catch {}
  }
  updateDiagnostics(root);
  rafId = requestAnimationFrame(tick);
};
rafId = requestAnimationFrame(tick);
} catch (e) {
console.error('Failed to create Babylon scene, falling back to 2D', e);
ctx = canvas.getContext('2d')!;
}

// Start ping interval (client-side ping/pong) only when visible
try {
  if (gameState?.ws && document.visibilityState === 'visible') {
    const ws = gameState.ws;
    pingTimer = window.setInterval(() => {
      try {
        lastPingTs = Date.now();
        ws.send(JSON.stringify({ type: 'ping', ts: lastPingTs }));
      } catch {}
    }, 3000);
  }
} catch {}

const roleEl = root.querySelector('#yourRole');
if (roleEl) roleEl.textContent = `Player ${gameState.playerNumber}`;
// Update diagnostics initially
updateDiagnostics(root);
gameState.score = initialState.score || { player1: 0, player2: 0 };
updateScoreDisplay(root);
updateStatus(root, '🎮 Game started!', 'success');
}

function updateDiagnostics(root: HTMLElement) {
  // Diagnostics removed from UI - can be logged to console if needed for debugging
  // Uncomment below for console debugging:
  // console.log('[Diagnostics]', {
  //   focus: document.hasFocus(),
  //   ws: gameState?.ws?.readyState === 1 ? 'OPEN' : gameState?.ws?.readyState,
  //   role: gameState?.playerNumber,
  //   visibility: document.visibilityState
  // });
}

function updateGameState(root: HTMLElement, state: any) {
if (!gameState) return;
gameState.score = state.score;
updateScoreDisplay(root);

// Map server state to Babylon GameRenderState and update scene
if (sceneController && typeof sceneController.update === 'function') {
try {
// During grace period, freeze ball/paddle visually
const effectiveBall = (Date.now() < ignoreStateUntil) ? { x: 0, y: 0 } : { x: state.ball?.x ?? 0, y: state.ball?.y ?? 0 };
const effectiveP1 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player1 ?? 0);
const effectiveP2 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player2 ?? 0);
const renderState = {
  ball: effectiveBall,
  paddles: {
    player1: effectiveP1,
    player2: effectiveP2,
  },
  score: {
    player1: state.score?.player1 ?? 0,
    player2: state.score?.player2 ?? 0,
  },
  match: {
    roundsWon: { player1: 0, player2: 0 },
    winner: null,
    currentRound: 1,
  },
  gameStatus: 'playing',
};
lastRenderState = renderState;
try { sceneController.update(renderState as any); } catch {}
return;
} catch (e) {
// Keep 3D active; do not switch to 2D mid-game
console.warn('Babylon update error, keeping 3D active', e);
}
}
// 2D fallback only if Babylon never initialized
if (!sceneController) {
drawGame(state);
}
}

function drawGame(state: any) {
	if (!ctx || !canvas) return;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Center line
	ctx.strokeStyle = '#333';
	ctx.setLineDash([15, 15]);
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
	ctx.setLineDash([]);

	// Paddles
	const paddleWidth = 15, paddleHeight = 100, paddleOffset = 40;

	ctx.fillStyle = '#3b82f6';
	const p1Y = canvas.height / 2 - state.paddles.player1;
	ctx.fillRect(paddleOffset, p1Y - paddleHeight / 2, paddleWidth, paddleHeight);

	ctx.fillStyle = '#ef4444';
	const p2Y = canvas.height / 2 - state.paddles.player2;
	ctx.fillRect(canvas.width - paddleOffset - paddleWidth, p2Y - paddleHeight / 2, paddleWidth, paddleHeight);

	// Ball
	ctx.fillStyle = '#fff';
	ctx.shadowBlur = 20;
	ctx.shadowColor = '#fff';
	ctx.beginPath();
	ctx.arc(canvas.width / 2 + state.ball.x, canvas.height / 2 - state.ball.y, 12, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;
}

function handleKeyDown(e: KeyboardEvent) {
  if (!gameState?.ws || gameState.ws.readyState !== WebSocket.OPEN) {
    console.warn('Key ignored: WS not open');
    return;
  }
  // Guard: only assigned players can send input (allow pre-start for testing responsiveness)
  if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) {
    console.warn('Key ignored: no role assigned');
    return;
  }

  const isUp = e.key === 'w' || e.key === 'W';
  const isDown = e.key === 's' || e.key === 'S';

  // Input grace: if within gate, allow but don't spam
  const now = Date.now();

  if (isUp && !keysPressed.has('up')) {
    keysPressed.add('up');
    if (now >= inputGateUntil) {
      gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'up' }));
    }
    // No repeat timer: rely on server to keep moving until stop
    e.preventDefault();
    e.stopPropagation();
  } else if (isDown && !keysPressed.has('down')) {
    keysPressed.add('down');
    if (now >= inputGateUntil) {
      gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'down' }));
    }
    // No repeat timer: rely on server to keep moving until stop
    e.preventDefault();
    e.stopPropagation();
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (!gameState?.ws) {
    console.warn('KeyUp ignored: no ws');
    return;
  }
  // Guard: only assigned players can send input
  if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) {
    console.warn('KeyUp ignored: no role');
    return;
  }

  const isHandled = e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S';
  if (isHandled) {
    const wasUp = keysPressed.has('up');
    const wasDown = keysPressed.has('down');
    if (wasUp) keysPressed.delete('up');
    if (wasDown) keysPressed.delete('down');
    if (!keysPressed.has('up') && !keysPressed.has('down')) {
      // No repeat to clear; just send stop once
      if (gameState.ws.readyState === WebSocket.OPEN) {
        gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'stop' }));
      }
    }
    e.preventDefault();
    e.stopPropagation();
  }
}

function updateScoreDisplay(root: HTMLElement) {
	if (!gameState) return;
	root.querySelector('#scoreP1')!.textContent = gameState.score.player1.toString();
	root.querySelector('#scoreP2')!.textContent = gameState.score.player2.toString();
}

function updateHud(root: HTMLElement, hud: { currentRound: number; roundsWon: { player1: number; player2: number }; score: { player1: number; player2: number }; scoreLimit: number; status: string; }) {
	try {
		const hudEl = root.querySelector('#hudText') as HTMLElement | null;
		if (hudEl) {
			hudEl.textContent = `Round ${hud.currentRound}/3 | P1 ${hud.roundsWon.player1} - P2 ${hud.roundsWon.player2} | to ${hud.scoreLimit}`;
		}
	} catch {}
}

function endGame(root: HTMLElement, data: any) {
	if (!gameState) return;

	gameState.gameStarted = false;
	const winner = data.winner;
	const isYouWinner = winner === gameState.playerNumber;

	// Show winner message in center of screen like countdown
	const display = root.querySelector('#countdownDisplay') as HTMLElement | null;
	if (display) {
		display.textContent = isYouWinner ? '🏆 YOU WON! 🏆' : `Player ${winner} Won!`;
		display.style.display = 'block';
		display.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-5xl font-bold drop-shadow-lg ' + 
			(isYouWinner ? 'text-green-400' : 'text-yellow-400');
	}

	updateStatus(root,
		isYouWinner ? '🎉🏆 YOU WON! 🏆🎉' : `Player ${winner} won!`,
		isYouWinner ? 'success' : 'info'
	);

	// Auto-return to remote page after 3 seconds
	setTimeout(() => {
		navigate('/remote');
	}, 3000);
}

function updateStatus(root: HTMLElement, message: string, type: 'info' | 'success' | 'error') {
	const box = root.querySelector('#statusBox') as HTMLElement | null;
	const text = root.querySelector('#statusText') as HTMLElement | null;
	if (!box || !text) return; // avoid null errors if elements hidden/unmounted

	box.className = `rounded border-2 p-4 ${type === 'success' ? 'bg-green-50 border-green-400' :
			type === 'error' ? 'bg-red-50 border-red-400' :
				'bg-blue-50 border-blue-400'
		}`;

	text.className = `font-semibold ${type === 'success' ? 'text-green-900' :
			type === 'error' ? 'text-red-900' :
				'text-blue-900'
		}`;

	text.textContent = message;
}