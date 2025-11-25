/**
 * Tournament Match Page (3D) – styled like local game
 */

import { navigate } from "@/app/router";
import { API_BASE, WS_BASE } from "@/app/config";
import { createLocalScene, GameRenderState } from "../../renderers/babylon/local-scene";

export default function (root: HTMLElement, ctx: any) {
  // --- Tournament / Match context ---
  const matchId = sessionStorage.getItem("currentMatchId") || "0";
  const tournamentId = sessionStorage.getItem("currentTournamentId");
  const matchPlayersStr = sessionStorage.getItem("currentMatchPlayers");

  let playerNames: string[] = [];
  if (matchPlayersStr) {
    try {
      playerNames = JSON.parse(matchPlayersStr);
    } catch {
      playerNames = ["Player 1", "Player 2"];
    }
  } else {
    playerNames =
      ctx?.players ||
      JSON.parse(sessionStorage.getItem("tournamentPlayers") || '["Player 1", "Player 2"]');
  }

  let player1Name = playerNames[0] || "Player 1";
  let player2Name = playerNames[1] || "Player 2";

  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let player1Keys = { up: false, down: false };
  let player2Keys = { up: false, down: false };

  // Game state in local render format (GameRenderState)
  let gameState: GameRenderState & {
    totalScore?: { player1: number; player2: number };
  } = {
    ball: { x: 0, y: 0 },
    paddles: { player1: 0, player2: 0 },
    score: { player1: 0, player2: 0 },
    match: {
      roundsWon: { player1: 0, player2: 0 },
      winner: null,
      currentRound: 1,
    },
    gameStatus: "waiting",
    totalScore: { player1: 0, player2: 0 },
  };

  let gameLoop: number | null = null;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  let hasSentStartGame = false;

  // Tournament match state
  let matchStarted = false;
  let matchCompleted = false;
  let matchInterrupted = false;
  let isProcessingInterrupt = false;

  // SessionStorage match status
  const matchKey = `match_${tournamentId}_${matchId}`;
  const matchStateRaw = sessionStorage.getItem(matchKey);
  if (matchStateRaw) {
    try {
      const state = JSON.parse(matchStateRaw);
      if (state.status === "completed") {
        matchCompleted = true;
      } else if (state.status === "interrupted") {
        matchInterrupted = true;
      } else if (state.status === "in-progress") {
        matchStarted = true;
      }
    } catch {
      sessionStorage.removeItem(matchKey);
    }
  }

  // --- UI: copy local game layout, but keep tournament semantics ---
  root.innerHTML = `
    <section class="fixed inset-0 overflow-hidden bg-black">
      <canvas id="gameCanvas"
        class="fixed inset-0 z-0 block"
        style="opacity:0">
      </canvas>

      <!-- Center HUD (round + score + hint) -->
      <div id="hudCenter"
        class="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white z-10">
        <div id="roundText" class="text-4xl font-bold">
          Round 1
        </div>
        <div id="scoreText" class="text-3xl font-bold">
          0 - 0
        </div>
        <p>🏆 First to 3 points wins a round. Win 2 rounds to win the match.</p>
      </div>

      <!-- Won counters -->
      <div id="hudWonP1"
        class="pointer-events-none fixed left-5 bottom-11 text-sm text-white z-10">
        Won: 0
      </div>
      <div id="hudWonP2"
        class="pointer-events-none fixed right-5 bottom-11 text-sm text-white z-10 text-right">
        Won: 0
      </div>

      <!-- Controls hint -->
      <div id="hudCtrlP1"
        class="pointer-events-none fixed left-5 bottom-6 text-sm text-gray-400 z-10">
        Player 1 (A/D)
      </div>
      <div id="hudCtrlP2"
        class="pointer-events-none fixed right-5 bottom-6 text-sm text-gray-400 z-10 text-right">
        Player 2 (←/→)
      </div>

      <!-- Buttons -->
      <div class="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
        <button id="startBtn"
          class="bg-[#5E2DD4] hover:bg-[#4e25b3] text-white px-4 py-2 rounded-xl font-semibold shadow">
          <span class="mr-2">🚀</span>Start Match
        </button>
        <button id="backBtn"
          class="bg-[#F6C343] hover:bg-[#e0b43b] text-black px-4 py-2 rounded-xl font-semibold shadow">
          <span class="mr-2">🏠</span>Tournament Lobby
        </button>
      </div>

      <!-- Status texts -->
      <div id="gameStatus"
        class="fixed bottom-16 left-1/2 -translate-x-1/2 text-zinc-200 text-sm md:text-base font-semibold text-center z-10">
        ${
          matchCompleted
            ? "✅ Match already completed"
            : matchInterrupted
            ? "❌ Tournament interrupted for this match"
            : "🏓 Click \"Start Match\" to play your tournament game"
        }
      </div>
      <div id="connectionStatus"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 text-zinc-400 text-xs md:text-sm text-center z-10">
      </div>

      <!-- Winner dialog -->
      <dialog id="winnerDialog" class="rounded-xl p-8 bg-white shadow-2xl text-center"></dialog>
    </section>
  `;

  const startBtn = root.querySelector("#startBtn") as HTMLButtonElement | null;
  const backBtn = root.querySelector("#backBtn") as HTMLButtonElement | null;
  const gameStatusEl = root.querySelector("#gameStatus") as HTMLDivElement;
  const connectionStatusEl = root.querySelector(
    "#connectionStatus"
  ) as HTMLDivElement;
  const roundTextEl = root.querySelector("#roundText") as HTMLDivElement;
  const scoreTextEl = root.querySelector("#scoreText") as HTMLDivElement;
  const hudWonP1El = root.querySelector("#hudWonP1") as HTMLDivElement;
  const hudWonP2El = root.querySelector("#hudWonP2") as HTMLDivElement;
  const winnerDialog = root.querySelector("#winnerDialog") as HTMLDialogElement;

  const el = root.querySelector("#gameCanvas");
  if (!(el instanceof HTMLCanvasElement)) {
    throw new Error("Canvas element #gameCanvas not found or not a <canvas>");
  }
  const gameCanvas: HTMLCanvasElement = el;

  // --- 3D Scene setup ---
  const scene3d = createLocalScene(gameCanvas);
  scene3d.ready.then(() => {
    gameCanvas.style.transition = "opacity 150ms ease-out";
    gameCanvas.style.opacity = "1";
  });

  // Resize canvas to full screen (like local.ts)
  function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    gameCanvas.style.width = width + "px";
    gameCanvas.style.height = height + "px";
    gameCanvas.width = width;
    gameCanvas.height = height;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function updateStatus(message: string) {
    if (gameStatusEl) gameStatusEl.textContent = message;
  }

  function updateConnectionStatus(message: string) {
    if (connectionStatusEl) connectionStatusEl.textContent = message;
  }

  function updateHud() {
    if (!roundTextEl || !scoreTextEl || !hudWonP1El || !hudWonP2El) return;

    const rawRound = gameState.match?.currentRound || 1;
    const currentRound = Math.min(rawRound, 3);

    const p1Score = gameState.score?.player1 ?? 0;
    const p2Score = gameState.score?.player2 ?? 0;

    const wonP1Raw = gameState.match?.roundsWon?.player1 ?? 0;
    const wonP2Raw = gameState.match?.roundsWon?.player2 ?? 0;

    const wonP1 = Math.min(2, wonP1Raw);
    const wonP2 = Math.min(2, wonP2Raw);

    roundTextEl.textContent = `Round ${currentRound}`;
    scoreTextEl.textContent = `${p1Score} - ${p2Score}`;
    hudWonP1El.textContent = `Won: ${wonP1}`;
    hudWonP2El.textContent = `Won: ${wonP2}`;
  }

  // Push current gameState into 3D
  function update3DFromGameState() {
    const renderState: GameRenderState = {
      ball: gameState.ball,
      paddles: gameState.paddles,
      score: gameState.score,
      match: {
        roundsWon: gameState.match?.roundsWon ?? { player1: 0, player2: 0 },
        winner: gameState.match?.winner ?? null,
        currentRound: gameState.match?.currentRound ?? 1,
      },
      gameStatus: gameState.gameStatus,
    };
    scene3d.update(renderState);
  }

  // Initial 3D + HUD
  update3DFromGameState();
  updateHud();

  // --- Tournament-specific helpers ---

  async function reportWinner(winnerName: string) {
    if (!tournamentId || !matchId) {
      console.log("No tournament context - skipping winner report");
      return;
    }

    const p1Score = gameState.score?.player1 ?? 0;
    const p2Score = gameState.score?.player2 ?? 0;

    try {
      console.log(
        `Reporting winner: ${winnerName} for match ${matchId} in tournament ${tournamentId}`,
        { p1Score, p2Score }
      );

      const response = await fetch(
        `${API_BASE}/tournaments/${tournamentId}/advance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            winner: winnerName,
            player1Score: p1Score,
            player2Score: p2Score,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to report winner:", response.status, errorText);
        return;
      }

      const result = await response.json();
      console.log(
        `Winner ${winnerName} reported to tournament ${tournamentId}`,
        result
      );
    } catch (error) {
      console.error("Error reporting winner:", error);
    }
  }

  async function forfeitMatch() {
    if (!tournamentId || !matchId) {
      console.log("No tournament context - skipping forfeit");
      return;
    }

    console.log(
      `🔴 forfeitMatch() START - Tournament: ${tournamentId}, Match: ${matchId}`
    );

    try {
      // Mark match as interrupted in sessionStorage
      sessionStorage.setItem(
        matchKey,
        JSON.stringify({
          status: "interrupted",
          reason: "player_left",
          interruptedAt: Date.now(),
        })
      );

      console.log("📝 SessionStorage updated with interrupted status");

      const data = JSON.stringify({
        matchId,
        reason: "player_left",
      });

      const url = `${API_BASE}/tournaments/${tournamentId}/interrupt`;
      console.log(`📡 Sending POST request to: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        credentials: "include",
        keepalive: true,
      });

      console.log(
        `📬 Response received:`,
        response.status,
        response.statusText
      );

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Tournament ${tournamentId} marked as interrupted`, result);
        matchInterrupted = true;
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to mark tournament as interrupted:",
          response.status,
          errorText
        );
      }
    } catch (error) {
      console.error("❌ Error marking tournament as interrupted:", error);
    }

    console.log(`🔴 forfeitMatch() END`);
  }

  function showWinnerDialog(winner: string) {
    if (!winnerDialog) return;

    let winnerDisplay = winner;
    let actualWinner = "";

    if (winner === "player1") {
      winnerDisplay = player1Name;
      actualWinner = player1Name;
    } else if (winner === "player2") {
      winnerDisplay = player2Name;
      actualWinner = player2Name;
    } else if (!winner) {
      winnerDisplay = "Nobody";
    }

    if (actualWinner) {
      // Mark match as completed and report to tournament service
      matchCompleted = true;
      sessionStorage.setItem(
        matchKey,
        JSON.stringify({
          status: "completed",
          winner: actualWinner,
          completedAt: Date.now(),
        })
      );
      reportWinner(actualWinner);
    }

    winnerDialog.innerHTML = `
      <div class="text-3xl font-bold mb-4">🏆 Winner!</div>
      <div class="text-2xl mb-6">${winnerDisplay}</div>
      <button id="winnerOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
        Go back to tournament
      </button>
    `;
    winnerDialog.showModal();
    winnerDialog
      .querySelector("#winnerOkBtn")
      ?.addEventListener("click", () => {
        winnerDialog.close();
        if (tournamentId) {
          navigate(`/tournaments/waitingroom/${tournamentId}`);
        } else {
          navigate("/tournaments");
        }
      });
  }

  // --- Backend game creation / WebSocket ---

  async function createTournamentGame(): Promise<string | null> {
    try {
      updateStatus("🔄 Creating tournament match...");
      updateConnectionStatus("📡 Connecting to gateway...");

      // Use same endpoint as previous tournament match code
      const response = await fetch(`${API_BASE}/pong/game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          // These can be pseudo-IDs, game service just uses them as identifiers
          player1_id: `tournament_${matchId}_p1`,
          player1_name: player1Name,
          player2_id: `tournament_${matchId}_p2`,
          player2_name: player2Name,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.id) {
        throw new Error("No game ID in response");
      }

      updateStatus(`🎮 Tournament match ${result.id} created successfully`);
      updateConnectionStatus("✅ Match created on backend");
      return result.id.toString();
    } catch (error) {
      console.error("❌ Error creating tournament match:", error);
      updateStatus("❌ Error creating match - please try again");
      updateConnectionStatus("❌ Backend connection failed");
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    connectionAttempts++;

    try {
      const WS_BASE_CLEAN = WS_BASE.replace(/\/+$/, "");
      const wsUrl = `${WS_BASE_CLEAN}/pong/game-ws/${gameId}`;
      console.log("[WS] Trying url:", wsUrl);

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS] open");
        connectionAttempts = 0;
        updateStatus("🌐 Connected! Starting match...");
        updateConnectionStatus("✅ Connected to backend game service");
        startNetworkGame();

        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "START_GAME" }));
          }
        }, 300);

        if (startBtn) startBtn.disabled = false;
      };

      ws.onmessage = async (event) => {
        try {
          let data = event.data;
          if (data instanceof Blob) data = await data.text();
          const parsed = JSON.parse(data);
          handleBackendMessage(parsed);
        } catch (error) {
          console.error("❌ Error parsing backend message:", error);
        }
      };

      ws.onclose = (event) => {
        if (gameLoop) {
          cancelAnimationFrame(gameLoop);
          gameLoop = null;
        }

        if (matchCompleted || matchInterrupted) {
          return;
        }

        if (startBtn) startBtn.disabled = false;

        // If we lost connection during play, mark interruption
        if (gameState.gameStatus === "playing") {
          updateStatus("❌ Connection lost during match");
          updateConnectionStatus("❌ Connection to backend lost");
        }

        if (
          connectionAttempts < maxConnectionAttempts &&
          event.code === 1006 &&
          gameState.gameStatus !== "playing"
        ) {
          updateStatus(
            `🔄 Connection lost, retrying... (${connectionAttempts}/${maxConnectionAttempts})`
          );
          setTimeout(() => connectWebSocket(gameId), 2000);
        } else if (!matchCompleted && !matchInterrupted) {
          updateStatus("❌ Backend connection failed - please try again");
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        updateStatus("❌ Connection error");
        updateConnectionStatus("❌ WebSocket error occurred");
        if (startBtn) startBtn.disabled = false;
      };
    } catch (error) {
      console.error("❌ Error connecting to WebSocket:", error);
      updateStatus("❌ Failed to connect - please try again");
      updateConnectionStatus("❌ Network connection failed");
      if (startBtn) startBtn.disabled = false;
    }
  }

/*
  let hasSentStartGame = false;

// async function reportWinner(winnerName: string) {
//   if (!tournamentId || !matchId) {
//     console.log("No tournament context - skipping winner report");
//     return;
//   }
  
//   try {
//     console.log(`Reporting winner: ${winnerName} for match ${matchId} in tournament ${tournamentId}`);
//     const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/advance`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ matchId: matchId, winner: winnerName })
//     });
    
//     if (response.ok) {
//       const result = await response.json();
//       console.log(`Winner ${winnerName} reported to tournament ${tournamentId}`, result);
//     } else {
//       const errorText = await response.text();
//       console.error('Failed to report winner:', response.status, errorText);
//     }
//   } catch (error) {
//     console.error('Error reporting winner:', error);
//   }
// }

async function reportWinner(winnerName: string) {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping winner report");
    return;
  }

  // Decide what you want to store:
  // - totalScore: all points across all rounds
  // - score: last round only
  const p1Score =
    gameState.totalScore?.player1 ??
    gameState.score?.player1 ??
    0;

  const p2Score =
    gameState.totalScore?.player2 ??
    gameState.score?.player2 ??
    0;

  try {
    console.log(
      `Reporting winner: ${winnerName} for match ${matchId} in tournament ${tournamentId}`,
      { p1Score, p2Score }
    );

    const response = await fetch(
      `${API_BASE}/tournaments/${tournamentId}/advance`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          matchId: matchId,
          winner: winnerName,
          player1Score: p1Score,
          player2Score: p2Score,
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(
        `Winner ${winnerName} reported to tournament ${tournamentId}`,
        result
      );
    } else {
      const errorText = await response.text();
      console.error('Failed to report winner:', response.status, errorText);
    }
  } catch (error) {
    console.error('Error reporting winner:', error);
  }
}


async function markMatchAsInterrupted() {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping interruption report");
    return;
  }
  
  try {
    console.log(`Marking match ${matchId} as interrupted in tournament ${tournamentId}`);
    const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/interrupt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ matchId: matchId, reason: 'connection_timeout' })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`Match ${matchId} marked as interrupted`, result);
      
      // Show interruption dialog
      if (winnerDialog) {
        winnerDialog.innerHTML = `
          <div class="text-3xl font-bold mb-4 text-red-600">❌ Match Interrupted</div>
          <div class="text-xl mb-4">Connection lost for more than 30 seconds</div>
          <div class="text-gray-600 mb-6">The tournament has been marked as interrupted.</div>
          <button id="interruptOkBtn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold">Back to Tournament</button>
        `;
        winnerDialog.showModal();
        winnerDialog.querySelector('#interruptOkBtn')?.addEventListener('click', () => {
          winnerDialog.close();
          if (tournamentId) {
            navigate(`/tournaments/waitingroom/${tournamentId}`);
          }
        });
      }
    } else {
      console.error('Failed to mark match as interrupted:', response.status);
    }
  } catch (error) {
    console.error('Error marking match as interrupted:', error);
  }
}
*/
/**
 * Send interruption request to backend
 * 
 * PURPOSE:
 * - Notifies backend that a player left during an active match
 * - Marks both the match and tournament as 'interrupted'
 * - Prevents any further matches in the tournament from being played
 * 
 * WHEN CALLED:
 * - User navigates away during active gameplay (via handlePageUnload)
 * - User closes browser tab/window (via beforeunload handler with sendBeacon)
 * 
 * TECHNICAL DETAILS:
 * - Uses fetch with keepalive:true to ensure completion during page unload
 * - Updates sessionStorage to persist interrupted state locally
 * - Sends POST to /tournaments/:id/interrupt endpoint
 * - Backend updates both match.status and tournament.status to 'interrupted'
 * 
 * FLOW:
 * 1. Update local sessionStorage state
 * 2. Send POST request with keepalive flag
 * 3. Backend marks tournament as interrupted
 * 4. All clients see updated status via polling/broadcast
 */
/*
async function forfeitMatch() {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping forfeit");
    return;
  }
  
  console.log(`🔴 forfeitMatch() START - Tournament: ${tournamentId}, Match: ${matchId}`);
  
  try {
    console.log(`Match ${matchId} interrupted - player left during game`);
    
    // Mark match as interrupted in sessionStorage
    sessionStorage.setItem(`match_${tournamentId}_${matchId}`, JSON.stringify({
      status: 'interrupted',
      reason: 'player_left',
      interruptedAt: Date.now()
    }));
    console.log('📝 SessionStorage updated with interrupted status');
    
    // Always use fetch (not beacon) to ensure it completes
    const data = JSON.stringify({ 
      matchId: matchId, 
      reason: 'player_left'
    });
    
    const url = `${API_BASE}/tournaments/${tournamentId}/interrupt`;
    console.log(`📡 Sending POST request to: ${url}`);
    console.log(`📦 Request body:`, data);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      credentials: 'include',
      keepalive: true // Ensures request completes even during page unload
    });
    
    console.log(`📬 Response received:`, response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Tournament ${tournamentId} marked as interrupted`, result);
      matchInterrupted = true; // Update local state
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to mark tournament as interrupted:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error marking tournament as interrupted:', error);
  }
  
  console.log(`🔴 forfeitMatch() END`);
}

function showWinnerDialog(winner: string) {
  if (!winnerDialog) return;
  let winnerDisplay = winner;
  let actualWinner = "";
  if (winner === "player1") {
    winnerDisplay = player1Name;
    actualWinner = player1Name;
  } else if (winner === "player2") {
    winnerDisplay = player2Name;
    actualWinner = player2Name;
  } else if (!winner) {
    winnerDisplay = "Nobody";
  }

  // Report winner to tournament service
  if (actualWinner) {
    reportWinner(actualWinner);
    
    // Mark match as completed
    matchCompleted = true;
    sessionStorage.setItem(`match_${tournamentId}_${matchId}`, JSON.stringify({
      status: 'completed',
      winner: actualWinner,
      completedAt: Date.now()
    }));
  }

  winnerDialog.innerHTML = `
    <div class="text-3xl font-bold mb-4">🏆 Winner!</div>
    <div class="text-2xl mb-6">${winnerDisplay}</div>
    <button id="winnerOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">go back to tournament</button>
  `;
  winnerDialog.showModal();
  winnerDialog.querySelector('#winnerOkBtn')?.addEventListener('click', () => {
    winnerDialog.close();
    // Navigate back to waiting room with tournament ID
    if (tournamentId) {
      navigate(`/tournaments/waitingroom/${tournamentId}`);
    } else {
      navigate('/tournaments');
    }
  });
}
*/

  function handleBackendMessage(data: any) {
    if (data.type === "STATE_UPDATE" && data.gameState) {
      const incoming = data.gameState;

      const match =
        incoming.match ??
        incoming.tournament ??
        gameState.match;

      gameState = {
        ball: incoming.ball ?? gameState.ball,
        paddles: incoming.paddles ?? gameState.paddles,
        score: incoming.score ?? gameState.score,
        match,
        gameStatus:
          incoming.gameStatus ||
          incoming.tournament?.gameStatus ||
          gameState.gameStatus ||
          "playing",
        totalScore: gameState.totalScore, // we don't rely on this for HUD
      };

      player1Name = incoming.player1_name || player1Name;
      player2Name = incoming.player2_name || player2Name;

      update3DFromGameState();
      updateHud();

      if (gameState.gameStatus === "playing") {
        updateStatus("🎮 Match active - Player 1: A/D, Player 2: ←/→");
        hasSentStartGame = false;
      } else if (
        gameState.gameStatus === "waiting" &&
        ws &&
        ws.readyState === WebSocket.OPEN &&
        !hasSentStartGame
      ) {
        ws.send(JSON.stringify({ type: "START_GAME" }));
        updateStatus("🔄 Starting match...");
        hasSentStartGame = true;
      } else if (gameState.gameStatus === "gameEnd") {
        const winner =
          gameState.match?.winner ||
          incoming.winner ||
          "Nobody";
        updateStatus(`🏆 Match ended! Winner: ${winner}`);
        showWinnerDialog(
          winner === player1Name
            ? "player1"
            : winner === player2Name
            ? "player2"
            : winner
        );
      }
    }
  }

  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Same controls as local.ts: A/D & ArrowLeft/ArrowRight
    if (player1Keys.up) {
      ws.send(
        JSON.stringify({
          type: "MOVE_PADDLE",
          player: "player1",
          direction: "up",
        })
      );
    }
    if (player1Keys.down) {
      ws.send(
        JSON.stringify({
          type: "MOVE_PADDLE",
          player: "player1",
          direction: "down",
        })
      );
    }
    if (player2Keys.up) {
      ws.send(
        JSON.stringify({
          type: "MOVE_PADDLE",
          player: "player2",
          direction: "up",
        })
      );
    }
    if (player2Keys.down) {
      ws.send(
        JSON.stringify({
          type: "MOVE_PADDLE",
          player: "player2",
          direction: "down",
        })
      );
    }
  }

  function startNetworkGame() {
    if (gameLoop) return;

    const updateNetworkGame = () => {
      if (
        ws &&
        ws.readyState === WebSocket.OPEN &&
        gameState.gameStatus === "playing"
      ) {
        sendPaddleMovement();
      }
      gameLoop = requestAnimationFrame(updateNetworkGame);
    };

    gameLoop = requestAnimationFrame(updateNetworkGame);
  }

  function setupKeyboardControls() {
    document.addEventListener("keydown", (e) => {
      let changed = false;

      // Player 1 (A / D)
      if (e.code === "KeyA") {
        if (!player1Keys.up) changed = true;
        player1Keys.down = true;
        e.preventDefault();
      } else if (e.code === "KeyD") {
        if (!player1Keys.down) changed = true;
        player1Keys.up = true;
        e.preventDefault();
      }
      // Player 2 (ArrowLeft / ArrowRight)
      else if (e.code === "ArrowLeft") {
        if (!player2Keys.up) changed = true;
        player2Keys.up = true;
        e.preventDefault();
      } else if (e.code === "ArrowRight") {
        if (!player2Keys.down) changed = true;
        player2Keys.down = true;
        e.preventDefault();
      }

      if (changed) sendPaddleMovement();
    });

    document.addEventListener("keyup", (e) => {
      let changed = false;

      if (e.code === "KeyA") {
        if (player1Keys.up) changed = true;
        player1Keys.down = false;
      } else if (e.code === "KeyD") {
        if (player1Keys.down) changed = true;
        player1Keys.up = false;
      } else if (e.code === "ArrowLeft") {
        if (player2Keys.up) changed = true;
        player2Keys.up = false;
      } else if (e.code === "ArrowRight") {
        if (player2Keys.down) changed = true;
        player2Keys.down = false;
      }

      if (changed) sendPaddleMovement();
    });
  }

  async function handleStartMatch() {
    if (matchCompleted) {
      updateStatus("✅ This match is already completed");
      return;
    }
    if (matchInterrupted) {
      updateStatus("❌ This match is interrupted");
      return;
    }

    // Split view like local game
    scene3d.setSplitView(true);

    connectionAttempts = 0;
    matchStarted = true;
    sessionStorage.setItem(
      matchKey,
      JSON.stringify({
        status: "in-progress",
        startTime: Date.now(),
      })
    );

    if (startBtn) startBtn.disabled = true;

    if (ws && ws.readyState === WebSocket.OPEN) {
      hasSentStartGame = false;
      ws.send(JSON.stringify({ type: "START_GAME" }));
      updateStatus("▶️ Start signal sent to backend");
      if (startBtn) startBtn.disabled = false;
      return;
    }

    updateStatus("🔄 Starting tournament match...");

    try {
      const newGameId = await createTournamentGame();
      if (newGameId) {
        gameId = newGameId;
        connectWebSocket(gameId);
      } else {
        updateStatus("❌ Failed to create match - please try again");
        if (startBtn) startBtn.disabled = false;
      }
    } catch (error) {
      console.error("❌ Error in handleStartMatch:", error);
      updateStatus("❌ Network error - please try again");
      if (startBtn) startBtn.disabled = false;
    }
  }

  function handleBackToTournament() {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    scene3d.dispose();
    if (tournamentId) {
      navigate(`/tournaments/waitingroom/${tournamentId}`);
    } else {
      navigate("/tournaments");
    }
  }

  async function handlePageUnload() {
    console.log("🚨 handlePageUnload() CALLED");

    if (isProcessingInterrupt) {
      console.log("⚠️ Already processing interrupt, skipping...");
      return;
    }

    if (
      matchStarted &&
      !matchCompleted &&
      !matchInterrupted &&
      gameState.gameStatus === "playing"
    ) {
      console.log("🔥 ACTIVE MATCH DETECTED - calling forfeitMatch()");
      isProcessingInterrupt = true;
      await forfeitMatch();
      isProcessingInterrupt = false;
      console.log("✅ forfeitMatch() completed");
    } else {
      console.log("ℹ️ No active match to interrupt");
    }

    console.log("🚨 handlePageUnload() FINISHED");
  }

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (
      matchStarted &&
      !matchCompleted &&
      !matchInterrupted &&
      gameState.gameStatus === "playing"
    ) {
      e.preventDefault();
      e.returnValue = "";

      if (!isProcessingInterrupt && tournamentId && matchId) {
        const data = JSON.stringify({ matchId, reason: "player_left" });
        navigator.sendBeacon(
          `${API_BASE}/tournaments/${tournamentId}/interrupt`,
          new Blob([data], { type: "application/json" })
        );
      }
      return "";
    }
  }

  // --- Initialize ---
  setupKeyboardControls();

  if (startBtn) {
    startBtn.addEventListener("click", handleStartMatch);
    if (matchCompleted || matchInterrupted) {
      startBtn.disabled = true;
      startBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }

  backBtn?.addEventListener("click", handleBackToTournament);

  window.addEventListener("beforeunload", handleBeforeUnload);

  // --- Cleanup for router ---
  return async () => {
    console.log("🧹 Cleanup function called - page being unmounted");
    await handlePageUnload();
    window.removeEventListener("beforeunload", handleBeforeUnload);
    if (ws) {
      console.log("Closing WebSocket connection");
      ws.close();
    }
    window.removeEventListener("resize", resizeCanvas);
    scene3d.dispose();
  };
}
