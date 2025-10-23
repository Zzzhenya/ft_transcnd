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
  // Don't move ball if game/round is ended or waiting to start
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

function endRound(gameState, roundWinner) {
  gameState.tournament.gameStatus = 'roundEnd';
  
  // Check if game is over (best of 3)
  const roundsToWin = Math.ceil(gameState.tournament.maxRounds / 2); // 2 rounds to win
  
  if (gameState.tournament.roundsWon[roundWinner] >= roundsToWin) {
    // Game is over!
    gameState.tournament.gameStatus = 'gameEnd';
    gameState.tournament.winner = roundWinner;
  } else {
    // Automatically start next round after delay
    setTimeout(() => {
      gameState.tournament.currentRound++;
      gameState.score.player1 = 0;
      gameState.score.player2 = 0;
      gameState.paddles.player1 = 0;  // Reset paddle positions
      gameState.paddles.player2 = 0;
      gameState.tournament.gameStatus = 'playing';
      resetBall(gameState); // Random direction for new round
    }, 3000); // 3 second delay between rounds
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
  resetBall(gameState);
}

function startGame(gameState) {
  gameState.tournament.gameStatus = 'playing';
  resetBall(gameState);
}

function startGameLoop(gameState, broadcastState, moveBall) {
  setInterval(() => {
    const oldBall = { ...gameState.ball };
    const oldScore = { ...gameState.score };

    moveBall(gameState);

    const ballMoved = oldBall.x !== gameState.ball.x || oldBall.y !== gameState.ball.y;
    const scoreChanged = oldScore.player1 !== gameState.score.player1 || oldScore.player2 !== gameState.score.player2;

    if (ballMoved || scoreChanged) {
      broadcastState();
    }
  }, 1000 / 60); // 60 FPS
  return gameState;
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
      scoreLimit: 3,
      roundsWon: { player1: 0, player2: 0 },
      gameStatus: 'waiting', // 'waiting', 'playing', 'roundEnd', 'gameEnd'
      winner: null,
    lastPointWinner: null
  }
};
}

export { checkRoundEnd, endRound, startNextRound, restartGame, startGame, startGameLoop, initialGameState };
