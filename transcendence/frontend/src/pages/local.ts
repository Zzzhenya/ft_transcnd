export default function (root: HTMLElement) {
  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let player1Keys = { up: false, down: false }; // WASD keys for left paddle
  let player2Keys = { up: false, down: false }; // Arrow keys for right paddle


  let gameState: any = {
  ball: { x: 0, y: 0 },
  paddles: { player1: 0, player2: 0 },
  score: { player1: 0, player2: 0 },
  tournament: { roundsWon: { player1: 0, player2: 0 }, winner: null, currentRound: 1 },
  gameStatus: 'waiting'
};

  let player1Name = 'Player 1';
  let player2Name = 'Player 2';
  let gameLoop: number | null = null;
  let lastTime = 0;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;

root.innerHTML = `
	<section class="py-10 px-4 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-gray-900"><section class="py-10 px-4 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
       <header class="mb-8 text-center">
        <h1 class="text-5xl font-extrabold text-white drop-shadow-lg">🏓 Pong Legends</h1>
        <p class="mt-2 text-lg text-indigo-200">Challenge your reflexes in a classic pong duel!</p>
      </header>
      <div class="flex gap-6 mb-8">
        <button id="startBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200">
          <span class="mr-2">🚀</span>Start Game
        </button>
        <button id="restartBtn" class="bg-gradient-to-r from-green-500 to-teal-500 hover:from-teal-500 hover:to-green-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200" disabled>
          <span class="mr-2">🔄</span>Restart
        </button>
        <button id="lobbyBtn" class="bg-gradient-to-r from-yellow-700 to-gray-900 hover:from-gray-900 hover:to-gray-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200">
          <span class="mr-2">🏠</span>Lobby
        </button>
      </div>
      <div id="gameStatus" class="mb-4 text-xl font-semibold text-indigo-100 text-center drop-shadow">
        🌐 Click "Start Game" to connect to backend
      </div>
      <div class="flex justify-center mb-6">
        <div class="rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 via-indigo-900 to-blue-900 p-6">
          <canvas id="gameCanvas" width="800" height="400" class="rounded-xl border-4 border-indigo-500 shadow-lg bg-black"></canvas>
        </div>
      </div>
      <div class="text-center text-indigo-200 text-base space-y-2 mb-2">
        <p id="connectionStatus">🔄 Ready to connect to backend game service</p>
        <p>🏆 First to 3 points wins a round. Win 2 rounds from 3 rounds to become the champion!</p>
        <p class="text-xs text-gray-400">Controls: Player 1 (W/S), Player 2 (↑/↓)</p>
      </div>
      <footer class="mt-8 text-gray-500 text-xs text-center">
        <span>Made with <span class="text-pink-400">♥</span> for Pong fans</span>
      </footer>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const restartBtn = root.querySelector('#restartBtn') as HTMLButtonElement;
  const lobbyBtn = root.querySelector('#lobbyBtn') as HTMLButtonElement;
  const gameStatus = root.querySelector('#gameStatus') as HTMLDivElement;
  const connectionStatus = root.querySelector('#connectionStatus') as HTMLParagraphElement;
  canvas = root.querySelector('#gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  function updateStatus(message: string) {
    gameStatus.textContent = message;
  }

  function updateConnectionStatus(message: string) {
    connectionStatus.textContent = message;
  }

  async function createLocalGame(): Promise<string | null> {
    try {
      updateStatus('🔄 Creating local game...');
      updateConnectionStatus('📡 Connecting to gateway...');
      
      const response = await fetch('http://localhost:3000/ws/pong/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Local game created:', result);

      if (!result.id) {
        throw new Error('No game ID in response');
      }

      updateStatus(`🎮 Local game ${result.id} created successfully`);
      updateConnectionStatus('✅ Game created on backend');
      return result.id.toString();
      
    } catch (error) {
      console.error('❌ Error creating local game:', error);
      updateStatus('❌ Error creating game - falling back to local');
      updateConnectionStatus('❌ Backend connection failed');
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    connectionAttempts++;
    try {
      const wsUrl = `ws://localhost:3000/ws/pong/game-ws/${gameId}`;
      console.log(`🔌 Connecting to WebSocket: ${wsUrl} (attempt ${connectionAttempts})`);
      updateStatus('🔄 Connecting to game...');
      updateConnectionStatus(`🔌 WebSocket connecting... (${connectionAttempts}/${maxConnectionAttempts})`);
      
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        updateStatus('🌐 Connected! Starting game...');
        updateConnectionStatus('✅ Connected to backend game service');
        
        // Start the network game loop
        startNetworkGame();
        
        // Start the game automatically when connected
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('📤 Sending START_GAME message');
            ws.send(JSON.stringify({
              type: 'START_GAME'
            }));
          }
        }, 500);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Backend message:', data);
          handleBackendMessage(data);
        } catch (error) {
          console.error('❌ Error parsing backend message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
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
        console.error('❌ WebSocket error:', error);
        updateStatus('❌ Connection error');
        updateConnectionStatus('❌ WebSocket error occurred');
      };
      
    } catch (error) {
      console.error('❌ Error connecting to WebSocket:', error);
      updateStatus('❌ Failed to connect - please try again');
      updateConnectionStatus('❌ Network connection failed');
      startBtn.disabled = false;
    }
  }


  let hasSentStartGame = false;

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
      updateStatus('🎮 Game active - Player 1: W/S, Player 2: ↑/↓');
      hasSentStartGame = false; // Reset for next round/game
    } else if (
      gameState.gameStatus === 'waiting' &&
      ws &&
      ws.readyState === WebSocket.OPEN &&
      !hasSentStartGame
    ) {
      ws.send(JSON.stringify({ type: 'START_GAME' }));
      updateStatus('🔄 Starting game after restart...');
      hasSentStartGame = true;
    } else if (gameState.gameStatus === 'gameEnd') {
      updateStatus(`🏆 Game ended! Winner: ${data.gameState.tournament?.winner || 'Nobody'}`);
    }
  }
}


  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // If not connected to backend, do nothing
      return;
    }
    
    // Send to backend only when keys are pressed
    let messagesSent = false;
    
    if (player1Keys.up) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player1',
        direction: 'up'
      }));
      messagesSent = true;
    }
    if (player1Keys.down) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player1',
        direction: 'down'
      }));
      messagesSent = true;
    }
    if (player2Keys.up) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player2',
        direction: 'up'
      }));
      messagesSent = true;
    }
    if (player2Keys.down) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player2',
        direction: 'down'
      }));
      messagesSent = true;
    }
    
    // Optional: Log when messages are sent for debugging
    if (messagesSent) {
      console.log('📤 Sent paddle movement to backend');
    }
  }

  function startNetworkGame() {
    console.log('🌐 Starting local game loop');
    
    // Reset connection flags
    startBtn.disabled = true;
    restartBtn.disabled = false;
    
    // Clear any existing local game loop
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    
    // Start the network game loop
    lastTime = 0;
    const updateNetworkGame = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;
      lastTime = currentTime;
      
      // Send paddle movements continuously while connected
     
        sendPaddleMovement();
      
      
      // Always render the current game state
      drawGame();
      
      // Continue the loop if still connected or game is active
      if ( gameState.gameStatus === 'playing') {
        gameLoop = requestAnimationFrame(updateNetworkGame);
      }
    };
    
    gameLoop = requestAnimationFrame(updateNetworkGame);
  }

function drawGame() {
  if (!ctx || !canvas || !gameState) return;

  // Clear canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw center line
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Scaling
  const scaleX = canvas.width / 100;   // x: -50 to +50 (100 units)
  const scaleY = canvas.height / 200;  // y: -100 to +100 (200 units)

  // Helper to convert game coordinates to canvas
  function toCanvasX(gameX: number) { return (gameX + 50) * scaleX; }
function toCanvasY(gameY: number) { return (100 - gameY) * scaleY; }

  // Paddle size in game units
  const paddleWidth = 2;
  const paddleHeight = 60;

  // Draw paddles
  ctx.fillStyle = '#00ff00';

  // Left paddle (Player 1)
  const leftPaddleX = -50;
const leftPaddleY = gameState.paddles.player1 + paddleHeight / 2;
ctx.fillRect(
  toCanvasX(leftPaddleX),
  toCanvasY(leftPaddleY),
  paddleWidth * scaleX,
  paddleHeight * scaleY
);

const rightPaddleX = 50 - paddleWidth; 
const rightPaddleY = gameState.paddles.player2 + paddleHeight / 2;
ctx.fillRect(
  toCanvasX(rightPaddleX),
  toCanvasY(rightPaddleY),
  paddleWidth * scaleX,
  paddleHeight * scaleY
);



  // Draw ball
  const ballRadius = 1; // game units
  ctx.shadowColor = '#ffff00';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(
    toCanvasX(gameState.ball.x),
    toCanvasY(gameState.ball.y),
    ballRadius * scaleX,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = '#ffff00';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw score
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `${gameState.score.player1} - ${gameState.score.player2}`,
    canvas.width / 2,
    50
  );


  // Draw player labels
  ctx.font = '16px Arial';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'left';
  ctx.fillText('Player 1 (W/S)', 20, canvas.height - 20);
  ctx.textAlign = 'right';

  ctx.fillText('Player 2 (↑/↓)', canvas.width - 20, canvas.height - 20);


 // Draw player names and rounds won on each side
  ctx.font = '20px Arial';
  ctx.fillStyle = '#00ffcc';
  ctx.textAlign = 'left';
  ctx.fillText(player1Name, 30, 40);
  ctx.font = '16px Arial';
  ctx.fillStyle = '#ffcc00';
  ctx.textAlign = 'left';
  ctx.fillText(
    `Rounds Won: ${gameState.tournament?.roundsWon?.player1 || 0}`,
    30,
    65 // 25px below the name
  );

  ctx.font = '20px Arial';
  ctx.fillStyle = '#00ffcc';
  ctx.textAlign = 'right';
  ctx.fillText(player2Name, canvas.width - 30, 40);
  ctx.font = '16px Arial';
  ctx.fillStyle = '#ffcc00';
  ctx.textAlign = 'right';
  ctx.fillText(
    `Rounds Won: ${gameState.tournament?.roundsWon?.player2 || 0}`,
    canvas.width - 30,
    65 // 25px below the
  );

  // Draw score
ctx.font = 'bold 36px Arial';
ctx.textAlign = 'center';
ctx.fillStyle = '#ffffff';
ctx.fillText(
  `${gameState.score.player1} - ${gameState.score.player2}`,
  canvas.width / 2,
  50
);

// Draw current round number under the score
ctx.font = 'bold 24px Arial';
ctx.fillStyle = '#00ffcc';
ctx.textAlign = 'center';
const currentRound = gameState.tournament?.currentRound || 1;
ctx.fillText(
  `Round ${currentRound}`,
  canvas.width / 2,
  85 // 35px below the score
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

  async function handleStartGame() {
    startBtn.disabled = true;
    connectionAttempts = 0;
    updateStatus('🔄 Starting local game...');
    
    try {
      const newGameId = await createLocalGame();
      if (newGameId) {
        console.log(`✅ Game created with ID: ${newGameId}`);
        gameId = newGameId;
        connectWebSocket(gameId);
        restartBtn.disabled = false;
      } else {
        console.log('❌ Failed to create game');
        updateStatus('❌ Failed to create game - please try again');
        startBtn.disabled = false;
      }
    } catch (error) {
      console.error('❌ Error in handleStartGame:', error);
      updateStatus('❌ Network error - please try again');
      startBtn.disabled = false;
    }
  }

  function handleRestartGame() {
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'RESTART_GAME' }));
      updateStatus('🔄 Restart request sent to backend');
    } else {
      updateStatus('❌ Cannot restart - not connected to backend');
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
    window.location.href = '/lobby';
  }

  // Initialize
  drawGame();
  
  // Continuous rendering for smooth display
  const renderLoop = () => {
    drawGame();
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);

  startBtn.addEventListener('click', handleStartGame);
  restartBtn.addEventListener('click', handleRestartGame);
  lobbyBtn.addEventListener('click', handleBackToLobby);
  setupKeyboardControls();
}
