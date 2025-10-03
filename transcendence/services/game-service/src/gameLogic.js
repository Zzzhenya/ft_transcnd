export function movePaddle(gameState, player, direction) {
  const paddleSpeed = 30;
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
  const paddleHeight = 40;
  const paddleX = 48;       // Match the display coordinates: paddles at x = ±48
  const speedIncrement = 0.3;

  // Simple ball movement - no speed multiplier
  gameState.ball.x += gameState.ball.dx;
  gameState.ball.y += gameState.ball.dy;

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

  // Left paddle collision - ball must actually reach paddle position
  if (
    gameState.ball.x <= -paddleX &&
    gameState.ball.x >= -paddleX - 2 &&
    gameState.ball.dx < 0 &&
    gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
  ) {
    gameState.ball.x = -paddleX;
    bounceOffPaddle(gameState.paddles.player1);
  }

  // Right paddle collision - ball must actually reach paddle position
  if (
    gameState.ball.x >= paddleX &&
    gameState.ball.x <= paddleX + 2 &&
    gameState.ball.dx > 0 &&
    gameState.ball.y >= gameState.paddles.player2 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player2 + paddleHeight / 2
  ) {
    gameState.ball.x = paddleX;
    bounceOffPaddle(gameState.paddles.player2);
  }

  if (gameState.ball.x < -50) {
    gameState.score.player2++;
    resetBall(gameState);
  } else if (gameState.ball.x > 50) {
    gameState.score.player1++;
    resetBall(gameState);
  }

  return gameState;
}

function resetBall(gameState) {
  gameState.ball.x = 0;
  gameState.ball.y = 0;
  gameState.ball.dx = Math.random() > 0.5 ? 1 : -1;
  gameState.ball.dy = (Math.random() - 0.5) * 2;
}
