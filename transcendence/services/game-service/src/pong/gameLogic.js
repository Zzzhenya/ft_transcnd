export function movePaddle(gameState, player, direction) {
  const paddleSpeed = 15;
  const paddleHeight = 60;
  // Game area is -100 to +100, paddle height is 40
  // So paddle center must be between -80 and +80 to keep paddle fully visible
  const topBoundary = -100 + paddleHeight / 2;    // -100 + 20 = -80
  const bottomBoundary = 100 - paddleHeight / 2;  // 100 - 20 = 80

  let dir = direction;
  if (direction === 'up') dir = 1;     // up moves paddle up (positive Y)
  if (direction === 'down') dir = -1;  // down moves paddle down (negative Y)
  
  const oldPosition = gameState.paddles[player];
  gameState.paddles[player] += dir * paddleSpeed;
  gameState.paddles[player] = Math.max(topBoundary, Math.min(bottomBoundary, gameState.paddles[player]));
  
  console.log(`[Paddle] ${player} moved ${direction}: ${oldPosition} -> ${gameState.paddles[player]} (boundaries: ${topBoundary} to ${bottomBoundary})`);

  return gameState;
}

export function moveBall(gameState) {
  // Don't move ball if game/round is ended or waiting to start
  if (gameState.tournament.gameStatus !== 'playing') {
    return gameState;
  }

  const paddleHeight = 60;
  const paddleX = 50;       // Paddles are at the boundaries: x = ±50 (same as scoring line)
  const speedIncrement = 0.1;
  const ballspeed = 1.2; // Base ball speed

  // Simple ball movement - no speed multiplier
  gameState.ball.x += gameState.ball.dx * (ballspeed + speedIncrement);
  gameState.ball.y += gameState.ball.dy * (ballspeed + speedIncrement);

  // Debug ball position when near boundaries
  if (Math.abs(gameState.ball.x) > 45) {
    console.log(`[Ball] Near boundary: x=${gameState.ball.x}, y=${gameState.ball.y}, dx=${gameState.ball.dx}, dy=${gameState.ball.dy}`);
  }

  // Wall collision - top and bottom boundaries
  if (gameState.ball.y >= 96) {
    gameState.ball.y = 96; // Position ball at wall surface (wall at 100, ball at 96)
    gameState.ball.dy *= -1;
  } else if (gameState.ball.y <= -96) {
    gameState.ball.y = -96; // Position ball at wall surface (wall at -100, ball at -96)
    gameState.ball.dy *= -1;
  }

  function bounceOffPaddle(paddleY) {
    const relativeY = gameState.ball.y - paddleY;
    const normalizedY = relativeY / (paddleHeight / 2);
    
    console.log(`[Bounce] Ball speed before: dx=${gameState.ball.dx}, dy=${gameState.ball.dy}`);
    
    // Keep constant speed - don't increase speed on each hit
    const baseSpeed = 2; // Constant ball speed
    
    gameState.ball.dx = gameState.ball.dx > 0 ? -baseSpeed : baseSpeed; // Reverse direction with constant speed
    gameState.ball.dy = normalizedY * baseSpeed; // Set Y velocity based on paddle hit position
    
    console.log(`[Bounce] Ball speed after: dx=${gameState.ball.dx}, dy=${gameState.ball.dy}`);
  }

  // Left paddle collision - ball hits paddle at left boundary
  if (
    gameState.ball.x <= -paddleX + 2 &&
    gameState.ball.x >= -paddleX &&
    gameState.ball.dx < 0 &&
    gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
  ) {
    console.log(`[Collision] Left paddle hit! Ball: (${gameState.ball.x}, ${gameState.ball.y}), Paddle1: ${gameState.paddles.player1}`);
    gameState.ball.x = -paddleX + 3; // Position ball at outer surface of paddle (paddle at -50, ball at -47)
    bounceOffPaddle(gameState.paddles.player1);
  }

  // Right paddle collision - ball hits paddle at right boundary
  if (
    gameState.ball.x >= paddleX - 2 &&
    gameState.ball.x <= paddleX &&
    gameState.ball.dx > 0 &&
    gameState.ball.y >= gameState.paddles.player2 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player2 + paddleHeight / 2
  ) {
    console.log(`[Collision] Right paddle hit! Ball: (${gameState.ball.x}, ${gameState.ball.y}), Paddle2: ${gameState.paddles.player2}`);
    gameState.ball.x = paddleX - 3; // Position ball at outer surface of paddle (paddle at +50, ball at +47)
    bounceOffPaddle(gameState.paddles.player2);
  }

  if (gameState.ball.x < -50) {
    console.log(`[SCORE] Ball missed left paddle! Final ball position: x=${gameState.ball.x}, y=${gameState.ball.y}`);
    gameState.score.player2++;
    gameState.tournament.lastPointWinner = 'player2';
    checkRoundEnd(gameState);
    resetBall(gameState, 'player1'); // Ball goes to loser (player1)
  } else if (gameState.ball.x > 50) {
    console.log(`[SCORE] Ball missed right paddle! Final ball position: x=${gameState.ball.x}, y=${gameState.ball.y}`);
    gameState.score.player1++;
    gameState.tournament.lastPointWinner = 'player1';
    checkRoundEnd(gameState);
    resetBall(gameState, 'player2'); // Ball goes to loser (player2)
  }

  return gameState;
}

function resetBall(gameState, direction = null) {
  gameState.ball.x = 0;
  gameState.ball.y = 0;
  
  if (direction === 'player1') {
    // Ball goes towards player1 (left side)
    gameState.ball.dx = -1;
  } else if (direction === 'player2') {
    // Ball goes towards player2 (right side)
    gameState.ball.dx = 1;
  } else {
    // Random direction if no specific direction
    gameState.ball.dx = Math.random() > 0.5 ? 1 : -1;
  }
  
  gameState.ball.dy = (Math.random() - 0.5) * 2;
}

function checkRoundEnd(gameState) {
  const scoreLimit = gameState.tournament.scoreLimit;
  
  // Check if round is over (someone reached score limit)
  if (gameState.score.player1 >= scoreLimit) {
    // Player 1 wins the round
    gameState.tournament.roundsWon.player1++;
    endRound(gameState, 'player1');
  } else if (gameState.score.player2 >= scoreLimit) {
    // Player 2 wins the round
    gameState.tournament.roundsWon.player2++;
    endRound(gameState, 'player2');
  }
}

function startRoundCountdown(gameState, broadcastState) {
  if (gameState.tournament.gameStatus !== 'roundCountdown') return;
  if (gameState.tournament.countdownInterval) return; // Already counting down
  
  // Broadcast initial countdown value first
  broadcastState();
  
  gameState.tournament.countdownInterval = setInterval(() => {
    gameState.tournament.nextRoundCountdown--;
    broadcastState(); // Broadcast the updated countdown
    
    if (gameState.tournament.nextRoundCountdown <= 0) {
      clearInterval(gameState.tournament.countdownInterval);
      gameState.tournament.countdownInterval = null;
      startNextRound(gameState);
      broadcastState(); // Broadcast the new round start
    }
  }, 1000); // Update every second
}

function endRound(gameState, roundWinner) {
  gameState.tournament.gameStatus = 'roundEnd';
  
  // Check if game is over (best of 3)
  const roundsToWin = Math.ceil(gameState.tournament.maxRounds / 2); // 2 rounds to win
  
  if (gameState.tournament.roundsWon[roundWinner] >= roundsToWin) {
    // Game is over!
    gameState.tournament.gameStatus = 'gameEnd';
    gameState.tournament.winner = roundWinner;
    
    // Auto-cleanup intervals when game ends to prevent CPU usage
    cleanupGame(gameState);
  } else {
    // Start countdown to next round
    gameState.tournament.gameStatus = 'roundCountdown';
    gameState.tournament.nextRoundNumber = gameState.tournament.currentRound + 1;
    gameState.tournament.nextRoundCountdown = 3;
    
    // Countdown with broadcasts (this needs to be called from a context with broadcastState)
    // The actual countdown will be handled by the game loop or route handlers
  }
}

function startNextRound(gameState) {
  gameState.tournament.currentRound++;
  gameState.score.player1 = 0;
  gameState.score.player2 = 0;
  gameState.paddles.player1 = 0;  // Reset paddle positions
  gameState.paddles.player2 = 0;
  gameState.tournament.gameStatus = 'playing';
  gameState.tournament.nextRoundCountdown = 0;
  gameState.tournament.countdownInterval = null;
  resetBall(gameState); // Random direction for new round
}

function restartGame(gameState) {
  // Clear any active intervals to prevent memory leaks
  if (gameState.tournament.countdownInterval) {
    clearInterval(gameState.tournament.countdownInterval);
    gameState.tournament.countdownInterval = null;
  }
  
  if (gameState.gameLoopInterval) {
    clearInterval(gameState.gameLoopInterval);
    gameState.gameLoopInterval = null;
  }
  
  gameState.score.player1 = 0;
  gameState.score.player2 = 0;
  gameState.paddles.player1 = 0;  // Reset paddle positions
  gameState.paddles.player2 = 0;
  gameState.tournament.currentRound = 1;
  gameState.tournament.roundsWon.player1 = 0;
  gameState.tournament.roundsWon.player2 = 0;
  gameState.tournament.gameStatus = 'waiting';  // Wait for start button
  gameState.tournament.winner = null;
  gameState.tournament.lastPointWinner = null;
  gameState.tournament.nextRoundCountdown = 0;
  resetBall(gameState);
}

function startGame(gameState) {
  gameState.tournament.gameStatus = 'playing';
  resetBall(gameState);
}

function cleanupGame(gameState) {
  // Clean up all intervals to prevent memory leaks
  if (gameState.tournament.countdownInterval) {
    clearInterval(gameState.tournament.countdownInterval);
    gameState.tournament.countdownInterval = null;
  }
  
  if (gameState.gameLoopInterval) {
    clearInterval(gameState.gameLoopInterval);
    gameState.gameLoopInterval = null;
  }
}

function startGameLoop(gameState, broadcastState, moveBall, getClientCount) {
  let lastBallX = gameState.ball.x;
  let lastBallY = gameState.ball.y;
  let lastScore1 = gameState.score.player1;
  let lastScore2 = gameState.score.player2;
  let lastPaddle1 = gameState.paddles.player1;
  let lastPaddle2 = gameState.paddles.player2;
  let lastStatus = gameState.tournament.gameStatus;
  let inactiveFrames = 0;
  
  const gameLoopInterval = setInterval(() => {
    const clientCount = getClientCount ? getClientCount() : 1;
    
    // Optimize CPU usage when no clients connected
    if (clientCount === 0 && gameState.tournament.gameStatus === 'playing') {
      inactiveFrames++;
      // Only check every 10 frames when no clients (save CPU)
      if (inactiveFrames % 10 !== 0) {
        return;
      }
    } else {
      inactiveFrames = 0;
    }
    
        // Only process ball movement if game is actively playing and has clients
    if (gameState.tournament.gameStatus === 'playing' && clientCount > 0) {
      moveBall(gameState);
    }

    const ballMoved = lastBallX !== gameState.ball.x || lastBallY !== gameState.ball.y;
    const scoreChanged = lastScore1 !== gameState.score.player1 || lastScore2 !== gameState.score.player2;
    const paddleMoved = lastPaddle1 !== gameState.paddles.player1 || lastPaddle2 !== gameState.paddles.player2;
    const statusChanged = lastStatus !== gameState.tournament.gameStatus;
    
    // Check if we just entered countdown state and start the countdown
    if (gameState.tournament.gameStatus === 'roundCountdown' && lastStatus !== 'roundCountdown') {
      startRoundCountdown(gameState, broadcastState);
    }

    // Smart broadcasting: only when something actually changed
    if (ballMoved || scoreChanged || paddleMoved || statusChanged) {
      // Only broadcast if there are clients to receive updates
      if (clientCount > 0) {
        broadcastState();
      }
      
      // Update last values for next comparison
      lastBallX = gameState.ball.x;
      lastBallY = gameState.ball.y;
      lastScore1 = gameState.score.player1;
      lastScore2 = gameState.score.player2;
      lastPaddle1 = gameState.paddles.player1;
      lastPaddle2 = gameState.paddles.player2;
      lastStatus = gameState.tournament.gameStatus;
    }
  }, 1000 / 20); // Reduced to 20 FPS for better CPU efficiency
  
  return gameLoopInterval;
}

// Game state
function initialGameState() {
  return {
    score: { player1: 0, player2: 0 },
    ball: { x: 0, y: 0, dx: 2, dy: 2 },
    paddles: { player1: 0, player2: 0 },
    tournament: {
      currentRound: 1,
      maxRounds: 3,
      scoreLimit: 3,
      roundsWon: { player1: 0, player2: 0 },
      gameStatus: 'waiting', // 'waiting', 'playing', 'roundEnd', 'gameEnd', 'roundCountdown'
      winner: null,
      lastPointWinner: null,
      nextRoundCountdown: 0,
      nextRoundNumber: 1,
      countdownInterval: null
    },
    gameLoopInterval: null
  };
}

export { checkRoundEnd, endRound, startNextRound, restartGame, startGame, startGameLoop, startRoundCountdown, cleanupGame, initialGameState };
