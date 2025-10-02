// export function movePaddle(gameState, player, direction) {
//   const paddleSpeed = 10;
//   const topBoundary = -100;   // top boundary
//   const bottomBoundary = 100; // bottom boundary

//   gameState.paddles[player] += direction * paddleSpeed;
//   gameState.paddles[player] = Math.max(topBoundary, Math.min(bottomBoundary, gameState.paddles[player]));

//   return gameState;
// }

// export function moveBall(gameState) {
//   // Move ball
//   gameState.ball.x += gameState.ball.vx;
//   gameState.ball.y += gameState.ball.vy;

//   // Bounce off top/bottom walls
//   if (gameState.ball.y >= 100 || gameState.ball.y <= -100) {
//     gameState.ball.vy *= -1;
//   }

//   // Paddle settings
//   const paddleHeight = 40;
//   const paddleX = 45; // near edges

//   // Left paddle (Player1)
//   if (
//     gameState.ball.x <= -paddleX &&
//     gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
//     gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
//   ) {
//     gameState.ball.vx *= -1; // bounce horizontally
//   }

//   // Right paddle (Player2)
//   if (
//     gameState.ball.x >= paddleX &&
//     gameState.ball.y >= gameState.paddles.player2 - paddleHeight / 2 &&
//     gameState.ball.y <= gameState.paddles.player2 + paddleHeight / 2
//   ) {
//     gameState.ball.vx *= -1;
//   }

//   // Scoring
//   if (gameState.ball.x < -50) {
//     gameState.score.player2++;
//     resetBall(gameState);
//   } else if (gameState.ball.x > 50) {
//     gameState.score.player1++;
//     resetBall(gameState);
//   }

//   return gameState;
// }

// function resetBall(gameState) {
//   gameState.ball.x = 0;
//   gameState.ball.y = 0;
//   gameState.ball.vx = Math.random() > 0.5 ? 1 : -1;
//   gameState.ball.vy = (Math.random() - 0.5) * 2;
// }


export function movePaddle(gameState, player, direction) {
  const paddleSpeed = 10;              // paddle movement per frame
  const topBoundary = -100;
  const bottomBoundary = 100;

  // Move paddle
  gameState.paddles[player] += direction * paddleSpeed;
  // Clamp within boundaries
  gameState.paddles[player] = Math.max(topBoundary, Math.min(bottomBoundary, gameState.paddles[player]));

  return gameState;
}

export function moveBall(gameState) {
  const paddleHeight = 40;
  const paddleX = 45;   // x position of paddles
  const speedIncrement = 0.2; // increase speed after paddle hit

  // Move ball
  gameState.ball.x += gameState.ball.vx;
  gameState.ball.y += gameState.ball.vy;

  // Bounce off top/bottom walls
  if (gameState.ball.y >= 100 || gameState.ball.y <= -100) {
    gameState.ball.vy *= -1;
  }

  // Paddle collision function
  function bounceOffPaddle(paddleY) {
    const relativeY = gameState.ball.y - paddleY;   // how far from paddle center
    const normalizedY = relativeY / (paddleHeight / 2); // -1 (top) to 1 (bottom)

    // Reverse horizontal direction
    gameState.ball.vx *= -1;

    // Adjust vertical velocity based on where it hit
    gameState.ball.vy = normalizedY * Math.abs(gameState.ball.vx);

    // Increase speed a bit
    if (gameState.ball.vx > 0) gameState.ball.vx += speedIncrement;
    else gameState.ball.vx -= speedIncrement;
  }

  // Left paddle
  if (
    gameState.ball.x <= -paddleX &&
    gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
  ) {
    bounceOffPaddle(gameState.paddles.player1);
  }

  // Right paddle
  if (
    gameState.ball.x >= paddleX &&
    gameState.ball.y >= gameState.paddles.player2 - paddleHeight / 2 &&
    gameState.ball.y <= gameState.paddles.player2 + paddleHeight / 2
  ) {
    bounceOffPaddle(gameState.paddles.player2);
  }

  // Scoring
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
  // Random horizontal direction
  gameState.ball.vx = Math.random() > 0.5 ? 1 : -1;
  // Random vertical velocity
  gameState.ball.vy = (Math.random() - 0.5) * 2;
}
