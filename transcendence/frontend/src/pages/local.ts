export default function (root: HTMLElement) {
  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let player1Keys = { up: false, down: false }; // WASD keys for left paddle
  let player2Keys = { up: false, down: false }; // Arrow keys for right paddle

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-8">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Local Game</h1>
        <p class="text-sm sm:text-base md:text-lg text-gray-600">
          Two-player local game - Player vs Player
        </p>
      </header>

      <div class="flex gap-4 justify-center">
        <button id="startBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
          Start Game
        </button>
        <button id="restartBtn" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold" disabled>
          Restart Game
        </button>
        <button id="lobbyBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold">
          Back to Lobby
        </button>
      </div>

      <div id="gameStatus" class="text-center text-lg font-medium">
        Click "Start Game" to begin
      </div>

      <div class="flex justify-center">
        <div class="bg-gray-900 p-4 rounded-lg shadow-lg">
          <canvas id="gameCanvas" width="800" height="400" class="border border-gray-700 bg-black"></canvas>
        </div>
      </div>

      <div class="text-center text-gray-500 text-sm space-y-1">
        <p><strong>Player 1 (Left Paddle):</strong> W/S keys to move up/down</p>
        <p><strong>Player 2 (Right Paddle):</strong> Arrow Keys ↑/↓ to move up/down</p>
        <p>Game connects through the gateway to the game service</p>
      </div>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const restartBtn = root.querySelector('#restartBtn') as HTMLButtonElement;
  const lobbyBtn = root.querySelector('#lobbyBtn') as HTMLButtonElement;
  const gameStatus = root.querySelector('#gameStatus') as HTMLDivElement;
  canvas = root.querySelector('#gameCanvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  function updateStatus(message: string) {
    gameStatus.textContent = message;
  }

  async function createDemoGame(): Promise<string | null> {
    try {
      updateStatus('Creating demo game...');
      
      // Call gateway API (not game service directly) - USE HTTP not WS!
      const response = await fetch('http://localhost:3000/ws/pong/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Parse the API response
      const result = await response.json();
      console.log('Demo game created:', result);
      
      // Expected response format:
      // {
      //   "id": 7,
      //   "player1_id": 13,
      //   "player2_id": 14,
      //   "player1_name": "d13", 
      //   "player2_name": "d14",
      //   "status": "demo",
      //   "isDemo": true,
      //   "message": "Demo game created with temporary players",
      //   "websocketUrl": "ws://localhost:3002/ws/pong/game-ws/7"
      // }
      
      if (!result.id) {
        throw new Error('No game ID in response');
      }
      
      updateStatus(`Demo game ${result.id} created successfully`);
      return result.id.toString();
      
    } catch (error) {
      console.error('Error creating demo game:', error);
      updateStatus('Error creating game');
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    try {
      const wsUrl = `ws://localhost:3000/ws/pong/game-ws/${gameId}`;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      updateStatus('Connecting to game...');
      
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        updateStatus('Connected! Game starting...');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          handleGameMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        updateStatus('Disconnected from game');
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('Connection error');
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      updateStatus('Failed to connect');
    }
  }

  function handleGameMessage(data: any) {
    if (data.type === 'gameState') {
      drawGame(data.gameState);
    } else if (data.type === 'gameStarted') {
      updateStatus('Game in progress - Player 1: W/S, Player 2: ↑/↓');
    } else if (data.type === 'gameEnded') {
      updateStatus(`Game ended! Winner: ${data.winner || 'Nobody'}`);
    }
  }

  function drawGame(gameState: any) {
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = '#444444';
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = '#ffffff';
    
    // Left paddle (Player 1)
    ctx.fillRect(20, gameState.leftPaddle.y, 10, 60);
    
    // Right paddle (Player 2)
    ctx.fillRect(canvas.width - 30, gameState.rightPaddle.y, 10, 60);
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw score
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${gameState.score.left} - ${gameState.score.right}`,
      canvas.width / 2,
      30
    );
    
    // Draw player labels
    ctx.font = '14px Arial';
    ctx.fillStyle = '#888888';
    ctx.textAlign = 'left';
    ctx.fillText('Player 1 (W/S)', 10, canvas.height - 10);
    ctx.textAlign = 'right';
    ctx.fillText('Player 2 (↑/↓)', canvas.width - 10, canvas.height - 10);
  }

  function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      // Player 1 controls (left paddle) - WASD
      if (e.key === 'w' || e.key === 'W') {
        player1Keys.up = true;
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S') {
        player1Keys.down = true;
        e.preventDefault();
      }
      // Player 2 controls (right paddle) - Arrow keys
      else if (e.key === 'ArrowUp') {
        player2Keys.up = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        player2Keys.down = true;
        e.preventDefault();
      }
      sendPaddleMovement();
    });

    document.addEventListener('keyup', (e) => {
      // Player 1 controls (left paddle) - WASD
      if (e.key === 'w' || e.key === 'W') {
        player1Keys.up = false;
      } else if (e.key === 's' || e.key === 'S') {
        player1Keys.down = false;
      }
      // Player 2 controls (right paddle) - Arrow keys
      else if (e.key === 'ArrowUp') {
        player2Keys.up = false;
      } else if (e.key === 'ArrowDown') {
        player2Keys.down = false;
      }
      sendPaddleMovement();
    });
  }

  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    // Player 1 (left paddle) movement
    let player1Direction = 0;
    if (player1Keys.up) player1Direction = -1;
    if (player1Keys.down) player1Direction = 1;
    
    // Player 2 (right paddle) movement
    let player2Direction = 0;
    if (player2Keys.up) player2Direction = -1;
    if (player2Keys.down) player2Direction = 1;
    
    // Send player 1 movement
    ws.send(JSON.stringify({
      type: 'MOVE_PADDLE',
      playerId: 'player1',
      direction: player1Direction
    }));
    
    // Send player 2 movement
    ws.send(JSON.stringify({
      type: 'MOVE_PADDLE',
      playerId: 'player2',
      direction: player2Direction
    }));
  }

  async function handleStartGame() {
    startBtn.disabled = true;
    updateStatus('Starting new game...');
    
    try {
      const newGameId = await createDemoGame();
      if (newGameId) {
        console.log(`Game created successfully with ID: ${newGameId}`);
        gameId = newGameId;
        connectWebSocket(gameId);
        restartBtn.disabled = false;
      } else {
        console.error('Failed to create game - no game ID returned');
        updateStatus('Failed to create game');
        startBtn.disabled = false;
      }
    } catch (error) {
      console.error('Error in handleStartGame:', error);
      updateStatus('Error starting game');
      startBtn.disabled = false;
    }
  }

  async function handleRestartGame() {
    if (!gameId || !ws || ws.readyState !== WebSocket.OPEN) {
      updateStatus('Cannot restart - not connected to game');
      return;
    }
    
    try {
      updateStatus('Restarting game...');
      
      // Send restart message via WebSocket
      ws.send(JSON.stringify({
        type: 'RESTART_GAME'
      }));
      
      updateStatus('Restart request sent');
    } catch (error) {
      console.error('Error restarting game:', error);
      updateStatus('Error restarting game');
    }
  }

  function handleBackToLobby() {
    // Close WebSocket connection if active
    if (ws) {
      ws.close();
      ws = null;
    }
    
    // Reset game state
    gameId = null;
    startBtn.disabled = false;
    restartBtn.disabled = true;
    
    // Navigate to lobby page
    window.location.href = '/lobby';
  }

  startBtn.addEventListener('click', handleStartGame);
  restartBtn.addEventListener('click', handleRestartGame);
  lobbyBtn.addEventListener('click', handleBackToLobby);
  setupKeyboardControls();
}
