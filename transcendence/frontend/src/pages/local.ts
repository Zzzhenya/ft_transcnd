// frontend/src/pages/local.ts
import { GATEWAY_BASE, WS_BASE } from '../app/config.js';
import { createLocalScene, GameRenderState } from '../renderers/babylon/local-scene';

export default function (root: HTMLElement) {
  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let player1Keys = { up: false, down: false };
  let player2Keys = { up: false, down: false };

  let gameState: GameRenderState = {
    ball: { x: 0, y: 0 },
    paddles: { player1: 0, player2: 0 },
    score: { player1: 0, player2: 0 },
    match: {
      roundsWon: { player1: 0, player2: 0 },
      winner: null,
      currentRound: 1,
    },
    gameStatus: 'waiting',
  };

  let player1Name = 'Player 1';
  let player2Name = 'Player 2';
  let gameLoop: number | null = null;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  let hasSentStartGame = false;
  let matchFinished = false;

// <div class="text-center text-indigo-200 text-base space-y-2 mb-2">
  root.innerHTML = `
    <section class="fixed inset-0 overflow-hidden bg-black">
	  <canvas id="gameCanvas"
		class="fixed inset-0 z-0 block"
		style="opacity:0">
	  </canvas>

	  <div id="hudCenter"
        class="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white z-10">
        <div id="roundText" class="text-4xl font-bold">
          Round 1
        </div>
        <div id="scoreText" class="text-3xl font-bold">
          0 - 0
        </div>
		<p> 🏆 First to 3 points wins a round.</p>
      </div>

      <div id="hudWonP1"
        class="pointer-events-none fixed left-5 bottom-11 text-sm text-white z-10">
        Won: 0
      </div>
      <div id="hudWonP2"
        class="pointer-events-none fixed right-5 bottom-11 text-sm text-white z-10 text-right">
        Won: 0
      </div>

	  <div id="hudCtrlP1"
        class="pointer-events-none fixed left-5 bottom-6 text-sm text-gray-400 z-10">
        Player 1 (W/S)
      </div>
      <div id="hudCtrlP2"
        class="pointer-events-none fixed right-5 bottom-6 text-sm text-gray-400 z-10 text-right">
        Player 2 (↑/↓)
      </div>

      <div class="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <button id="startBtn"
          class="bg-[#5E2DD4] hover:bg-[#4e25b3] text-white px-4 py-2 rounded-xl font-semibold shadow">
          <span class="mr-2">🚀</span>Start
        </button>
        <button id="lobbyBtn"
          class="bg-[#F6C343] hover:bg-[#e0b43b] text-black px-4 py-2 rounded-xl font-semibold shadow">
          <span class="mr-2">🏠</span>Lobby
        </button>
      </div>

      <div id="gameStatus"
        class="fixed bottom-16 left-1/2 -translate-x-1/2 text-zinc-200 text-sm md:text-base font-semibold text-center">
        🏓 Click "Start" to play ping pong
      </div>

      <footer class="mt-8 text-gray-500 text-xs text-center">
        <span>Made with <span class="text-white-400">TEAM.SHIRT</span></span>
      </footer>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const lobbyBtn = root.querySelector('#lobbyBtn') as HTMLButtonElement;
  const gameStatusEl = root.querySelector('#gameStatus') as HTMLDivElement;
  const connectionStatusEl = root.querySelector('#connectionStatus') as HTMLParagraphElement;
  const el = root.querySelector('#gameCanvas');

  // HUD elements
  const roundTextEl = root.querySelector('#roundText') as HTMLDivElement;
  const scoreTextEl = root.querySelector('#scoreText') as HTMLDivElement;
  const hudWonP1El = root.querySelector('#hudWonP1') as HTMLDivElement;
  const hudWonP2El = root.querySelector('#hudWonP2') as HTMLDivElement;

  if (!(el instanceof HTMLCanvasElement)) {
    throw new Error('Canvas element #gameCanvas not found or not a <canvas>');
  }

  const gameCanvas: HTMLCanvasElement = el;

  function isMatchOver(): boolean {
    const roundsWonP1 = gameState.match?.roundsWon?.player1 ?? 0;
    const roundsWonP2 = gameState.match?.roundsWon?.player2 ?? 0;
    const currentRound = gameState.match?.currentRound ?? 1;

    // 3라운드 제한 + 2선승 규칙
    if (roundsWonP1 >= 2 || roundsWonP2 >= 2) return true;
    if (currentRound > 3) return true;

    return false;
  }

  function handleMatchEndIfNeeded() {
    if (!isMatchOver()) return;

    const roundsWonP1 = gameState.match?.roundsWon?.player1 ?? 0;
    const roundsWonP2 = gameState.match?.roundsWon?.player2 ?? 0;

    let winnerName: string;
    if (roundsWonP1 > roundsWonP2) {
      winnerName = player1Name;
    } else if (roundsWonP2 > roundsWonP1) {
      winnerName = player2Name;
    } else {
      winnerName = 'No one';
    }

    // Won must 2. It's fixed.
    const finalP1 = Math.min(2, roundsWonP1);
    const finalP2 = Math.min(2, roundsWonP2);

    hudWonP1El.textContent = `Won: ${finalP1}`;
    hudWonP2El.textContent = `Won: ${finalP2}`;

    // Status message.
    if (winnerName === 'No one') {
      updateStatus('🏁 Match over. It\'s a draw.');
    } else {
      updateStatus(`🏆 Match over! ${winnerName} wins the series.`);
    }

	matchFinished = true;

    // Block not to push startBtn anymore.
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    // 네트워크/루프 정리
    if (ws) {
      ws.close();
      ws = null;
    }
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }

    // Go back to lobby.
    setTimeout(() => {
      window.location.href = '/lobby';
    }, 3500);
  }

  // Babylon 3D scene starts
  const scene3d = createLocalScene(gameCanvas);

  scene3d.ready.then(() => {
    gameCanvas.style.transition = 'opacity 150ms ease-out';
    gameCanvas.style.opacity = '1';
  });

  function updateStatus(message: string) {
    if (gameStatusEl) gameStatusEl.textContent = message;
  }

  function updateConnectionStatus(message: string) {
    if (connectionStatusEl) connectionStatusEl.textContent = message;
  }

  // resize() in local-scene.ts
  function resizeCanvas() {
	const width = window.innerWidth;
	const height = window.innerHeight;
	gameCanvas.style.width = width + 'px';
	gameCanvas.style.height = height + 'px';
	gameCanvas.width = width;
	gameCanvas.height = height;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

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

  async function createLocalGame(): Promise<string | null> {
    try {
      updateStatus('🔄 Creating local game...');
      updateConnectionStatus('📡 Connecting to gateway...');

      const response = await fetch(`${GATEWAY_BASE}/pong/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1_id: 1, player1_name: "Player 1",
          player2_id: 2, player2_name: "Player 2"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.id) {
        throw new Error('No game ID in response');
      }

      updateStatus(`🎮 Local game ${result.id} created successfully`);
      updateConnectionStatus('✅ Game created on backend');

      (window as any).gameWebSocketUrl = result.websocketUrl;
      return result.id.toString();
    } catch (error) {
      console.error(error);
      updateStatus('❌ Error creating game - falling back to local');
      updateConnectionStatus('❌ Backend connection failed');
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    connectionAttempts++;

    try {
      const WS_BASE_CLEAN = WS_BASE.replace(/\/+$/, '');
      const wsUrl = `${WS_BASE_CLEAN}/pong/game-ws/${gameId}`;
      console.log('[WS] Trying url:', wsUrl);

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WS] open');
        connectionAttempts = 0;
        updateStatus('🌐 Connected! Starting game...');
        updateConnectionStatus('✅ Connected to backend game service');
        startNetworkGame();

        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'START_GAME' }));
          }
        }, 300);
        startBtn.disabled = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleBackendMessage(data);
        } catch (error) {
          console.error('❌ Error parsing backend message:', error);
        }
      };

      ws.onclose = (event) => {
        if (gameLoop) {
			cancelAnimationFrame(gameLoop);
			gameLoop = null;
		}
		if (matchFinished) {
			return ;
		}

        startBtn.disabled = false;

        if (connectionAttempts < maxConnectionAttempts && event.code === 1006) {
          updateStatus(`🔄 Connection lost, retrying... (${connectionAttempts}/${maxConnectionAttempts})`);
          setTimeout(() => connectWebSocket(gameId), 2000);
        } else {
          updateStatus('❌ Backend connection failed - please try again');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        updateStatus('❌ Connection error');
        updateConnectionStatus('❌ WebSocket error occurred');
        startBtn.disabled = false;
      };
    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      updateStatus('❌ Failed to connect - please try again');
      updateConnectionStatus('❌ Network connection failed');
      startBtn.disabled = false;
    }
  }

  function handleBackendMessage(data: any) {
    if (data.type === 'STATE_UPDATE' && data.gameState) {
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
		gameStatus: incoming.gameStatus || gameState.gameStatus || 'playing',
	  };

      player1Name = incoming.player1_name || player1Name;
      player2Name = incoming.player2_name || player2Name;

      // Update 3D scene
      scene3d.update(gameState);
	  updateHud();

	  if (isMatchOver()) {
		handleMatchEndIfNeeded();
		return ;
	  }

      if (gameState.gameStatus === 'playing') {
        updateStatus('🎮 Game active - Player 1: W/S, Player 2: ↑/↓');
        hasSentStartGame = false;
      } else if (
        gameState.gameStatus === 'waiting' &&
        ws &&
        ws.readyState === WebSocket.OPEN &&
        !hasSentStartGame
      ) {
        ws.send(JSON.stringify({ type: 'START_GAME' }));
        updateStatus('🔄 Starting game...');
        hasSentStartGame = true;
      } else if (gameState.gameStatus === 'gameEnd') {
		const winner =
			gameState.match?.winner ||
			incoming.winner ||
			'Nobody';
        updateStatus(`🏆 Game ended! Winner: ${winner}`);
      }
    }
  }

  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (player1Keys.up) {
      ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player1', direction: 'up' }));
    }
    if (player1Keys.down) {
      ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player1', direction: 'down' }));
    }
    if (player2Keys.up) {
      ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player2', direction: 'up' }));
    }
    if (player2Keys.down) {
      ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player2', direction: 'down' }));
    }
  }

  function startNetworkGame() {
    if (gameLoop) return;

    const updateNetworkGame = () => {
	  if (ws && ws.readyState === WebSocket.OPEN && gameState.gameStatus === 'playing') {
		sendPaddleMovement();
	  }
      gameLoop = requestAnimationFrame(updateNetworkGame);
    };

    gameLoop = requestAnimationFrame(updateNetworkGame);
  }

  function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      let changed = false;

	  // Player 1 (A / D)
      if (e.code === 'KeyA') { if (!player1Keys.up) changed = true; player1Keys.down = true; e.preventDefault(); }
      else if (e.code === 'KeyD') { if (!player1Keys.down) changed = true; player1Keys.up = true; e.preventDefault(); }
      else if (e.code === 'ArrowLeft') { if (!player2Keys.up) changed = true; player2Keys.up = true; e.preventDefault(); }
      else if (e.code === 'ArrowRight') { if (!player2Keys.down) changed = true; player2Keys.down = true; e.preventDefault(); }
      if (changed) sendPaddleMovement();
    });

	// Player 2 (ArrowLeft / ArrowRight)
    document.addEventListener('keyup', (e) => {
      let changed = false;
      if (e.code === 'KeyA') { if (player1Keys.up) changed = true; player1Keys.down = false; }
      else if (e.code === 'KeyD') { if (player1Keys.down) changed = true; player1Keys.up = false; }
      else if (e.code === 'ArrowLeft') { if (player2Keys.up) changed = true; player2Keys.up = false; }
      else if (e.code === 'ArrowRight') { if (player2Keys.down) changed = true; player2Keys.down = false; }
      if (changed) sendPaddleMovement();
    });
  }

  async function handleStartGame() {
    if (isMatchOver()) {
		handleMatchEndIfNeeded();
		return ;
	}

	// When 'startbtn' is on, -> true.
	scene3d.setSplitView(true);

	connectionAttempts = 0;
	startBtn.disabled = true;

    if (ws && ws.readyState === WebSocket.OPEN) {
      hasSentStartGame = false;
      ws.send(JSON.stringify({ type: 'START_GAME' }));
      updateStatus('▶️ Start signal sent to backend');
	  startBtn.disabled = false;
      return;
    }

    updateStatus('🔄 Starting local game...');

    try {
      const newGameId = await createLocalGame();
      if (newGameId) {
        gameId = newGameId;
        connectWebSocket(gameId);
      } else {
        updateStatus('❌ Failed to create game - please try again');
        startBtn.disabled = false;
      }
    } catch (error) {
      console.error('❌ Error in handleStartGame:', error);
      updateStatus('❌ Network error - please try again');
      startBtn.disabled = false;
    }
  }

  function handleBackToLobby() {
    if (ws) {
      ws.close();
      ws = null;
    }
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    scene3d.dispose();
    window.location.href = '/lobby';
  }

  // Setting init
  scene3d.update(gameState);
  updateHud();
  setupKeyboardControls();
  startBtn.addEventListener('click', handleStartGame);
  lobbyBtn.addEventListener('click', handleBackToLobby);
}
