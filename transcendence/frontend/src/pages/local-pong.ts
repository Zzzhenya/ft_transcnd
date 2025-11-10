// local-pong.ts
export default function (root: HTMLElement) {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let player1Keys = { up: false, down: false }; // WASD keys for left paddle
  let player2Keys = { up: false, down: false }; // Arrow keys for right paddle
  
  // Local game state for real Pong gameplay
  let gameState = {
    ball: { x: 0, y: 0, dx: 3, dy: 2 },
    paddles: { player1: 0, player2: 0 },
    score: { player1: 0, player2: 0 },
    gameStatus: 'waiting'
  };
  let gameLoop: number | null = null;
  let lastTime = 0;

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-8">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">🏓 Real Pong Game</h1>
        <p class="text-sm sm:text-base md:text-lg text-gray-600">
          Two-player local game with real physics and collision detection!
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
        🎮 Click "Start Game" to begin playing real Pong!
      </div>

      <div class="flex justify-center">
        <div class="bg-gray-900 p-4 rounded-lg shadow-lg">
          <canvas id="gameCanvas" width="800" height="400" class="border border-gray-700 bg-black"></canvas>
        </div>
      </div>

      <div class="text-center text-gray-500 text-sm space-y-1">
        <p><strong>🎯 Player 1 (Left Paddle):</strong> W/S keys to move up/down</p>
        <p><strong>🎯 Player 2 (Right Paddle):</strong> Arrow Keys ↑/↓ to move up/down</p>
        <p>⚡ Real-time local Pong with physics, collision detection, and scoring!</p>
        <p>🏆 First to 5 points wins!</p>
      </div>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const restartBtn = root.querySelector('#restartBtn') as HTMLButtonElement;
  const lobbyBtn = root.querySelector('#lobbyBtn') as HTMLButtonElement;
  const gameStatus = root.querySelector('#gameStatus') as HTMLDivElement;
  const el = document.getElementById('gameCanvas');
  if (!(el instanceof HTMLCanvasElement)) {
	throw new Error('Canvas element #gameCanvas not found or not a <canvas>');
  }
  canvas = el;
  const context = canvas.getContext('2d')!;
  if (!context) {
	throw new Error('2D context not available');
  }
  ctx = context;

  function updateStatus(message: string) {
    gameStatus.textContent = message;
  }

  function startLocalGame() {
    // Reset game state
    gameState = {
      ball: { x: 0, y: 0, dx: Math.random() > 0.5 ? 3 : -3, dy: (Math.random() - 0.5) * 4 },
      paddles: { player1: 0, player2: 0 },
      score: { player1: 0, player2: 0 },
      gameStatus: 'playing'
    };
    
    updateStatus('🏓 Pong Game Active! Player 1: W/S, Player 2: ↑/↓');
    startBtn.disabled = true;
    restartBtn.disabled = false;
    
    // Start the local game loop
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
    }
    
    lastTime = 0;
    const updateGame = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      if (gameState.gameStatus === 'playing') {
        updateLocalGameState(deltaTime);
      }
      drawGame();
      
      if (gameState.gameStatus !== 'ended') {
        gameLoop = requestAnimationFrame(updateGame);
      }
    };
    
    gameLoop = requestAnimationFrame(updateGame);
  }
  
  function updateLocalGameState(deltaTime: number) {
    const paddleSpeed = 0.3; // Paddle speed
    const ballSpeed = 0.2; // Ball speed
    
    // Update paddle positions based on key states
    if (player1Keys.up && gameState.paddles.player1 > -80) {
      gameState.paddles.player1 -= paddleSpeed * deltaTime;
    }
    if (player1Keys.down && gameState.paddles.player1 < 80) {
      gameState.paddles.player1 += paddleSpeed * deltaTime;
    }
    
    if (player2Keys.up && gameState.paddles.player2 > -80) {
      gameState.paddles.player2 -= paddleSpeed * deltaTime;
    }
    if (player2Keys.down && gameState.paddles.player2 < 80) {
      gameState.paddles.player2 += paddleSpeed * deltaTime;
    }
    
    // Update ball position
    gameState.ball.x += gameState.ball.dx * ballSpeed * deltaTime;
    gameState.ball.y += gameState.ball.dy * ballSpeed * deltaTime;
    
    // Ball collision with top/bottom walls
    if (gameState.ball.y > 90 || gameState.ball.y < -90) {
      gameState.ball.dy = -gameState.ball.dy;
    }
    
    // Ball collision with paddles
    const paddleHeight = 30;
    
    // Left paddle collision (at x = -90)
    if (gameState.ball.x <= -85 && gameState.ball.x >= -95 && 
        gameState.ball.y >= gameState.paddles.player1 - paddleHeight &&
        gameState.ball.y <= gameState.paddles.player1 + paddleHeight &&
        gameState.ball.dx < 0) {
      gameState.ball.dx = Math.abs(gameState.ball.dx) * 1.05; // Speed up slightly
      // Add some spin based on where it hit the paddle
      const hitPos = (gameState.ball.y - gameState.paddles.player1) / paddleHeight;
      gameState.ball.dy += hitPos * 2;
    }
    
    // Right paddle collision (at x = +90)
    if (gameState.ball.x >= 85 && gameState.ball.x <= 95 && 
        gameState.ball.y >= gameState.paddles.player2 - paddleHeight &&
        gameState.ball.y <= gameState.paddles.player2 + paddleHeight &&
        gameState.ball.dx > 0) {
      gameState.ball.dx = -Math.abs(gameState.ball.dx) * 1.05; // Speed up slightly
      // Add some spin based on where it hit the paddle
      const hitPos = (gameState.ball.y - gameState.paddles.player2) / paddleHeight;
      gameState.ball.dy += hitPos * 2;
    }
    
    // Limit ball Y velocity
    if (Math.abs(gameState.ball.dy) > 6) {
      gameState.ball.dy = gameState.ball.dy > 0 ? 6 : -6;
    }
    
    // Limit ball X velocity (max speed)
    if (Math.abs(gameState.ball.dx) > 8) {
      gameState.ball.dx = gameState.ball.dx > 0 ? 8 : -8;
    }
    
    // Scoring
    if (gameState.ball.x > 100) {
      // Player 1 scores
      gameState.score.player1++;
      resetBall();
      updateStatus(`🎯 Player 1 scores! Score: ${gameState.score.player1} - ${gameState.score.player2}`);
    } else if (gameState.ball.x < -100) {
      // Player 2 scores
      gameState.score.player2++;
      resetBall();
      updateStatus(`🎯 Player 2 scores! Score: ${gameState.score.player1} - ${gameState.score.player2}`);
    }
    
    // Check for game end
    if (gameState.score.player1 >= 5 || gameState.score.player2 >= 5) {
      gameState.gameStatus = 'ended';
      const winner = gameState.score.player1 >= 5 ? 'Player 1' : 'Player 2';
      updateStatus(`🏆 Game Over! ${winner} wins! Final Score: ${gameState.score.player1} - ${gameState.score.player2}`);
      startBtn.disabled = false;
    }
  }
  
  function resetBall() {
    gameState.ball.x = 0;
    gameState.ball.y = 0;
    // Serve towards the player who didn't score
    gameState.ball.dx = gameState.ball.dx > 0 ? -3 : 3;
    gameState.ball.dy = (Math.random() - 0.5) * 4; // Random Y direction
  }

  function drawGame() {
    if (!ctx || !canvas) {
      console.log('❌ Cannot draw: missing context or canvas');
      return;
    }
    
    // Clear canvas with nice background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Convert coordinates from game space (-100 to +100) to canvas (0 to 800x400)
    const scaleX = canvas.width / 200;   // 800 / 200 = 4
    const scaleY = canvas.height / 200;  // 400 / 200 = 2
    const offsetX = canvas.width / 2;    // 400
    const offsetY = canvas.height / 2;   // 200
    
    function toCanvasX(gameX: number) { return offsetX + (gameX * scaleX); }
    function toCanvasY(gameY: number) { return offsetY - (gameY * scaleY); } // Flip Y axis
    
    // Draw paddles
    ctx.fillStyle = '#ffffff';
    
    const paddleWidth = 12;
    const paddleHeight = 60;
    
    // Left paddle (Player 1)
    const leftPaddleX = toCanvasX(-90);
    const leftPaddleY = toCanvasY(gameState.paddles.player1) - paddleHeight / 2;
    ctx.fillRect(leftPaddleX - paddleWidth/2, leftPaddleY, paddleWidth, paddleHeight);
    
    // Right paddle (Player 2)
    const rightPaddleX = toCanvasX(90);
    const rightPaddleY = toCanvasY(gameState.paddles.player2) - paddleHeight / 2;
    ctx.fillRect(rightPaddleX - paddleWidth/2, rightPaddleY, paddleWidth, paddleHeight);
    
    // Draw ball with trail effect
    const ballX = toCanvasX(gameState.ball.x);
    const ballY = toCanvasY(gameState.ball.y);
    
    // Ball trail
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffff00';
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Ball center
    ctx.beginPath();
    ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
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
    
    // Draw speed indicator
    const speed = Math.sqrt(gameState.ball.dx * gameState.ball.dx + gameState.ball.dy * gameState.ball.dy);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    ctx.fillText(`Speed: ${speed.toFixed(1)}`, canvas.width / 2, canvas.height - 5);
    
    // Draw game status
    if (gameState.gameStatus === 'playing') {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'center';
      ctx.fillText('🎮 PLAYING', canvas.width / 2, canvas.height - 40);
    } else if (gameState.gameStatus === 'ended') {
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#ff0000';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 GAME OVER', canvas.width / 2, canvas.height / 2 + 50);
      
      const winner = gameState.score.player1 >= 5 ? 'Player 1' : 'Player 2';
      ctx.font = '18px Arial';
      ctx.fillStyle = '#ffff00';
      ctx.fillText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2 + 75);
    }
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
    });
  }

  function handleStartGame() {
    startLocalGame();
  }

  function handleRestartGame() {
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    startLocalGame();
  }

  function handleBackToLobby() {
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    
    // Navigate to lobby page
    window.location.href = '/lobby';
  }

  // Initialize the game with a static display
  drawGame();

  startBtn.addEventListener('click', handleStartGame);
  restartBtn.addEventListener('click', handleRestartGame);
  lobbyBtn.addEventListener('click', handleBackToLobby);
  setupKeyboardControls();
}