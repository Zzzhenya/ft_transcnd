
import { navigate } from "@/app/router";

export default function (root: HTMLElement, ctx: any) {
  const playerNames: string[] = ctx?.players
    || JSON.parse(sessionStorage.getItem("tournamentPlayers") || '["Player 1","Player 2"]');
  let player1Name = playerNames[0] || "Player 1";
  let player2Name = playerNames[1] || "Player 2";

  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let ctx2d: CanvasRenderingContext2D | null = null;
  let player1Keys = { up: false, down: false };
  let player2Keys = { up: false, down: false };

  let gameState: any = {
    ball: { x: 0, y: 0 },
    paddles: { player1: 0, player2: 0 },
    score: { player1: 0, player2: 0 },
    tournament: { roundsWon: { player1: 0, player2: 0 }, winner: null, currentRound: 1 },
    gameStatus: 'waiting'
  };

  let gameLoop: number | null = null;
  let lastTime = 0;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;

  root.innerHTML = `
    <section class="py-10 px-4 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-gray-900">
      <header class="mb-8 text-center">
        <h1 class="text-5xl font-extrabold text-white drop-shadow-lg">🏓 Tournament Match</h1>
        <p class="mt-2 text-lg text-indigo-200">Players: <span class="font-bold">${player1Name} vs ${player2Name}</span></p>
      </header>
      <div class="flex gap-6 mb-8">
        <button id="startBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200">
          <span class="mr-2">🚀</span>Start Match
        </button>
      </div>
      <div id="gameStatus" class="mb-4 text-xl font-semibold text-indigo-100 text-center drop-shadow">
        🌐 Click "Start Match" to connect to backend
      </div>
      <div class="flex justify-center mb-6">
        <div class="rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 via-indigo-900 to-blue-900 p-6">
          <canvas id="gameCanvas" width="800" height="400" class="rounded-xl border-4 border-indigo-500 shadow-lg bg-black"></canvas>
        </div>
      </div>
      <div class="text-center text-indigo-200 text-base space-y-2 mb-2">
        <p id="connectionStatus">🔄 Ready to connect to backend game service</p>
        <p>🏆 First to 3 points wins a round. Win 2 rounds from 3 rounds to become the champion!</p>
        <p class="text-xs text-gray-400">Controls: ${player1Name} (W/S), ${player2Name} (↑/↓)</p>
      </div>
      <footer class="mt-8 text-gray-500 text-xs text-center">
        <span>Made with <span class="text-pink-400">♥</span> for Pong fans</span>
      </footer>
      <dialog id="winnerDialog" class="rounded-xl p-8 bg-white shadow-2xl text-center"></dialog>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const gameStatus = root.querySelector('#gameStatus') as HTMLDivElement;
  const connectionStatus = root.querySelector('#connectionStatus') as HTMLParagraphElement;
  const winnerDialog = root.querySelector('#winnerDialog') as HTMLDialogElement;
  // Safely query the canvas element and validate its type to satisfy TypeScript
  const canvasEl = root.querySelector('#gameCanvas');
  if (!canvasEl || !(canvasEl instanceof HTMLCanvasElement)) {
    console.error('Canvas element #gameCanvas not found or is not a HTMLCanvasElement');
    updateStatus('❌ Canvas element not available');
    // Abort initialization early to avoid runtime errors
    return;
  }
  canvas = canvasEl;
  ctx2d = canvas.getContext('2d') || null;

  function updateStatus(message: string) {
    gameStatus.textContent = message;
  }

  function updateConnectionStatus(message: string) {
    connectionStatus.textContent = message;
  }

  async function createTournamentGame(): Promise<string | null> {
    try {
      updateStatus('🔄 Creating tournament match...');
      updateConnectionStatus('📡 Connecting to gateway...');
      const response = await fetch('http://localhost:3000/ws/pong/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: [player1Name, player2Name] })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.id) throw new Error('No game ID in response');
      updateStatus(`🎮 Tournament match ${result.id} created successfully`);
      updateConnectionStatus('✅ Match created on backend');
      return result.id.toString();
    } catch (error) {
      console.error('❌ Error creating tournament match:', error);
      updateStatus('❌ Error creating match - please try again');
      updateConnectionStatus('❌ Backend connection failed');
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    connectionAttempts++;
    try {
      const wsUrl = `ws://localhost:3000/ws/pong/game-ws/${gameId}`;
      ws = new WebSocket(wsUrl);
      updateStatus('🔄 Connecting to match...');
      updateConnectionStatus(`🔌 WebSocket connecting... (${connectionAttempts}/${maxConnectionAttempts})`);

      ws.onopen = () => {
        updateStatus('🌐 Connected! Starting match...');
        updateConnectionStatus('✅ Connected to backend match');
        startNetworkGame();
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'START_GAME' }));
          }
        }, 500);
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
        if (connectionAttempts < maxConnectionAttempts && event.code === 1006) {
          updateStatus(`🔄 Connection lost, retrying... (${connectionAttempts}/${maxConnectionAttempts})`);
          updateConnectionStatus(`🔄 Reconnecting... (${connectionAttempts}/${maxConnectionAttempts})`);
          setTimeout(() => connectWebSocket(gameId), 2000);
        } else {
          updateStatus('❌ Backend connection failed - please try again');
          updateConnectionStatus('❌ Unable to connect to backend');
          startBtn.disabled = false;
        }
      };

      ws.onerror = (error) => {
        updateStatus('❌ Connection error');
        updateConnectionStatus('❌ WebSocket error occurred');
      };
    } catch (error) {
      updateStatus('❌ Failed to connect - please try again');
      updateConnectionStatus('❌ Network connection failed');
      startBtn.disabled = false;
    }
  }

  let hasSentStartGame = false;

function showWinnerDialog(winner: string) {
  if (!winnerDialog) return;
  let winnerDisplay = winner;
  if (winner === "player1") winnerDisplay = player1Name;
  else if (winner === "player2") winnerDisplay = player2Name;
  else if (!winner) winnerDisplay = "Nobody";

  winnerDialog.innerHTML = `
    <div class="text-3xl font-bold mb-4">🏆 Winner!</div>
    <div class="text-2xl mb-6">${winnerDisplay}</div>
    <button id="winnerOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">go back to tournament</button>
  `;
  winnerDialog.showModal();
  winnerDialog.querySelector('#winnerOkBtn')?.addEventListener('click', () => {
    winnerDialog.close();
    navigate('/tournaments/waitingroom');
  });
}

  function handleBackendMessage(data: any) {
    if (data.type === 'STATE_UPDATE' && data.gameState) {
      gameState = {
        ball: data.gameState.ball || gameState.ball,
        paddles: data.gameState.paddles || gameState.paddles,
        score: data.gameState.score || gameState.score,
        tournament: data.gameState.tournament || gameState.tournament,
        gameStatus: data.gameState.tournament?.gameStatus || 'playing'
      };
      player1Name = data.gameState.player1_name || player1Name;
      player2Name = data.gameState.player2_name || player2Name;

      if (gameState.gameStatus === 'playing') {
        updateStatus('🎮 Match active - Player 1: W/S, Player 2: ↑/↓');
        hasSentStartGame = false;
      } else if (
        gameState.gameStatus === 'waiting' &&
        ws &&
        ws.readyState === WebSocket.OPEN &&
        !hasSentStartGame
      ) {
        ws.send(JSON.stringify({ type: 'START_GAME' }));
        updateStatus('🔄 Starting match after restart...');
        hasSentStartGame = true;
      } else if (gameState.gameStatus === 'gameEnd') {
        const winner = data.gameState.tournament?.winner || 'Nobody';
        updateStatus(`🏆 Match ended! Winner: ${winner}`);
        showWinnerDialog(winner);
      }
    }
  }

  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (player1Keys.up) ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player1', direction: 'up' }));
    if (player1Keys.down) ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player1', direction: 'down' }));
    if (player2Keys.up) ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player2', direction: 'up' }));
    if (player2Keys.down) ws.send(JSON.stringify({ type: 'MOVE_PADDLE', player: 'player2', direction: 'down' }));
  }

  function startNetworkGame() {
    startBtn.disabled = true;
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    lastTime = 0;
    const updateNetworkGame = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;
      lastTime = currentTime;
      sendPaddleMovement();
      drawGame();
      if (gameState.gameStatus === 'playing') {
        gameLoop = requestAnimationFrame(updateNetworkGame);
      }
    };
    gameLoop = requestAnimationFrame(updateNetworkGame);
  }

  function drawGame() {
    if (!ctx2d || !canvas || !gameState) return;
    ctx2d.fillStyle = '#000000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    ctx2d.setLineDash([10, 10]);
    ctx2d.beginPath();
    ctx2d.moveTo(canvas.width / 2, 0);
    ctx2d.lineTo(canvas.width / 2, canvas.height);
    ctx2d.strokeStyle = '#00ff00';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    const scaleX = canvas.width / 100;
    const scaleY = canvas.height / 200;
    function toCanvasX(gameX: number) { return (gameX + 50) * scaleX; }
    function toCanvasY(gameY: number) { return (100 - gameY) * scaleY; }

    const paddleWidth = 2;
    const paddleHeight = 60;

    ctx2d.fillStyle = '#00ff00';
    const leftPaddleX = -50;
    const leftPaddleY = gameState.paddles.player1 + paddleHeight / 2;
    ctx2d.fillRect(
      toCanvasX(leftPaddleX),
      toCanvasY(leftPaddleY),
      paddleWidth * scaleX,
      paddleHeight * scaleY
    );
    const rightPaddleX = 50 - paddleWidth;
    const rightPaddleY = gameState.paddles.player2 + paddleHeight / 2;
    ctx2d.fillRect(
      toCanvasX(rightPaddleX),
      toCanvasY(rightPaddleY),
      paddleWidth * scaleX,
      paddleHeight * scaleY
    );

    const ballRadius = 1;
    ctx2d.shadowColor = '#ffff00';
    ctx2d.shadowBlur = 15;
    ctx2d.beginPath();
    ctx2d.arc(
      toCanvasX(gameState.ball.x),
      toCanvasY(gameState.ball.y),
      ballRadius * scaleX,
      0,
      Math.PI * 2
    );
    ctx2d.fillStyle = '#ffff00';
    ctx2d.fill();
    ctx2d.shadowBlur = 0;

    ctx2d.font = 'bold 36px Arial';
    ctx2d.textAlign = 'center';
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillText(
      `${gameState.score.player1} - ${gameState.score.player2}`,
      canvas.width / 2,
      50
    );

    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#888888';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(`${player1Name} (W/S)`, 20, canvas.height - 20);
    ctx2d.textAlign = 'right';
    ctx2d.fillText(`${player2Name} (↑/↓)`, canvas.width - 20, canvas.height - 20);

    ctx2d.font = '20px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(player1Name, 30, 40);
    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#ffcc00';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(
      `Rounds Won: ${gameState.tournament?.roundsWon?.player1 || 0}`,
      30,
      65
    );

    ctx2d.font = '20px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'right';
    ctx2d.fillText(player2Name, canvas.width - 30, 40);
    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#ffcc00';
    ctx2d.textAlign = 'right';
    ctx2d.fillText(
      `Rounds Won: ${gameState.tournament?.roundsWon?.player2 || 0}`,
      canvas.width - 30,
      65
    );

    ctx2d.font = 'bold 24px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'center';
    const currentRound = gameState.tournament?.currentRound || 1;
    ctx2d.fillText(
      `Round ${currentRound}`,
      canvas.width / 2,
      85
    );
  }

  function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      let changed = false;
      if (e.key === 'w' || e.key === 'W') {
        if (!player1Keys.up) changed = true;
        player1Keys.up = true;
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S') {
        if (!player1Keys.down) changed = true;
        player1Keys.down = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        if (!player2Keys.up) changed = true;
        player2Keys.up = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (!player2Keys.down) changed = true;
        player2Keys.down = true;
        e.preventDefault();
      }
      if (changed) sendPaddleMovement();
    });

    document.addEventListener('keyup', (e) => {
      let changed = false;
      if (e.key === 'w' || e.key === 'W') {
        if (player1Keys.up) changed = true;
        player1Keys.up = false;
      } else if (e.key === 's' || e.key === 'S') {
        if (player1Keys.down) changed = true;
        player1Keys.down = false;
      } else if (e.key === 'ArrowUp') {
        if (player2Keys.up) changed = true;
        player2Keys.up = false;
      } else if (e.key === 'ArrowDown') {
        if (player2Keys.down) changed = true;
        player2Keys.down = false;
      }
      if (changed) sendPaddleMovement();
    });
  }

  async function handleStartMatch() {
    startBtn.disabled = true;
    connectionAttempts = 0;
    updateStatus('🔄 Starting tournament match...');
    try {
      const newGameId = await createTournamentGame();
      if (newGameId) {
        gameId = newGameId;
        connectWebSocket(gameId);
      } else {
        updateStatus('❌ Failed to create match - please try again');
        startBtn.disabled = false;
      }
    } catch (error) {
      updateStatus('❌ Network error - please try again');
      startBtn.disabled = false;
    }
  }

  // Initialize
  drawGame();
  const renderLoop = () => {
    drawGame();
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  startBtn.addEventListener('click', handleStartMatch);
  setupKeyboardControls();
}