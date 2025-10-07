export function movePaddle(gameState, player, direction) {
  const paddleSpeed = 15;
  const paddleHeight = 40;
  const topBoundary = -100 + paddleHeight / 2;
  const bottomBoundary = 100 - paddleHeight / 2;

  let dir = direction;
  if (direction === 'up') dir = 1;     // up moves paddle up (positive Y)
  if (direction === 'down') dir = -1;  // down moves paddle down (negative Y)
  
  gameState.paddles[player] += dir * paddleSpeed;
  gameState.paddles[player] = Math.max(topBoundary, Math.min(bottomBoundary, gameState.paddles[player]));

  return gameState;
}

export function moveBall(gameState) {
  // Don't move ball if game/round is ended, waiting to start, or paused
  if (gameState.tournament.gameStatus !== 'playing') {
    return gameState;
  }

  const paddleHeight = 40;
  const paddleX = 50;       // Paddles are at the boundaries: x = ±50
  const speedIncrement = 0.1;
  const ballspeed = 0.5;

  // Simple ball movement - no speed multiplier
  gameState.ball.x += gameState.ball.dx * (ballspeed + speedIncrement);
  gameState.ball.y += gameState.ball.dy * (ballspeed + speedIncrement);

  if (gameState.ball.y >= 100 || gameState.ball.y <= -100) {
    gameState.ball.dy *= -1;
  }

  function bounceOffPaddle(paddleY) {
    const relativeY = gameState.ball.y - paddleY;
    const normalizedY = relativeY / (paddleHeight / 2);
    gameState.ball.dx *= -1;
    gameState.ball.dy = normalizedY * Math.abs(gameState.ball.dx);
    if (gameState.ball.dx > 0) gameState.ball.dx += speedIncrement;
    else gameState.ball.dx -= speedIncrement;
  }

  // Left paddle collision - ball hits paddle at left boundary
  if (
    gameState.ball.x <= -paddleX + 2 &&
    gameState.ball.x >= -paddleX &&
    gameState.ball.dx < 0 &&
    gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
  ) {
    gameState.ball.x = -paddleX + 2;
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
    gameState.ball.x = paddleX - 2;
    bounceOffPaddle(gameState.paddles.player2);
  }

  if (gameState.ball.x < -50) {
    gameState.score.player2++;
    gameState.tournament.lastPointWinner = 'player2';
    checkRoundEnd(gameState);
    resetBall(gameState, 'player1'); // Ball goes to loser (player1)
  } else if (gameState.ball.x > 50) {
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
  
  const countdownInterval = setInterval(() => {
    gameState.tournament.nextRoundCountdown--;
    broadcastState(); // Broadcast the updated countdown
    
    if (gameState.tournament.nextRoundCountdown <= 0) {
      clearInterval(countdownInterval);
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
  let framesSinceLastChange = 0;
  
  const gameLoopInterval = setInterval(() => {
    const clientCount = getClientCount ? getClientCount() : 1;
    
    // Only process ball movement if game is playing and there are connected clients
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

    // Only broadcast if something actually changed
    if (ballMoved || scoreChanged || paddleMoved || statusChanged) {
      broadcastState();
      framesSinceLastChange = 0;
      
      // Update last values
      lastBallX = gameState.ball.x;
      lastBallY = gameState.ball.y;
      lastScore1 = gameState.score.player1;
      lastScore2 = gameState.score.player2;
      lastPaddle1 = gameState.paddles.player1;
      lastPaddle2 = gameState.paddles.player2;
      lastStatus = gameState.tournament.gameStatus;
    } else {
      framesSinceLastChange++;
      
      // If nothing has changed for 60 frames (2 seconds), reduce frequency to save CPU
      if (framesSinceLastChange > 60 && clientCount === 0) {
        // Pause the game loop when no clients are connected and nothing is changing
        return;
      }
    }
  }, 1000 / 30); // 30 FPS when active
  
  return gameLoopInterval;
}

// Game state
function initialGameState() {
  return {
    score: { player1: 0, player2: 0 },
    ball: { x: 0, y: 0, dx: 1, dy: 1 },
    paddles: { player1: 0, player2: 0 },
    tournament: {
      currentRound: 1,
      maxRounds: 3,
      scoreLimit: 5,
      roundsWon: { player1: 0, player2: 0 },
      gameStatus: 'waiting', // 'waiting', 'playing', 'roundEnd', 'gameEnd', 'roundCountdown'
      winner: null,
      lastPointWinner: null,
      nextRoundCountdown: 0,
      nextRoundNumber: 1
    }
  };
}

export { checkRoundEnd, endRound, startNextRound, restartGame, startGame, startGameLoop, startRoundCountdown, cleanupGame, initialGameState };
