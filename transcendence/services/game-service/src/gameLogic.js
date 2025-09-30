const GAME_WIDTH = 100;
const GAME_HEIGHT = 50;
const PADDLE_HEIGHT = 10;
const BALL_SIZE = 2;
const PADDLE_SPEED = 2;
const BALL_SPEED = 2;

// Move paddle
function movePaddle(gameState, player, direction) {
  if (!gameState.paddles || typeof gameState.paddles[player] !== 'number') {
    throw new Error(`Invalid paddles object or player key: ${player}`);
  }
  let pos = gameState.paddles[player];
  pos += direction * PADDLE_SPEED;
  pos = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, pos));
  gameState.paddles[player] = pos;
  return gameState;
}
function moveBall(gameState) {
  if (
    !gameState.ball ||
    typeof gameState.ball.x !== 'number' ||
    typeof gameState.ball.y !== 'number' ||
    typeof gameState.ball.vx !== 'number' ||
    typeof gameState.ball.vy !== 'number'
  ) {
    throw new Error('Invalid ball object in gameState');
  }
  let ball = gameState.ball;
  ball.x += ball.vx * BALL_SPEED;
  ball.y += ball.vy * BALL_SPEED;

  // Top/bottom wall collision
  if (ball.y <= 0 || ball.y >= GAME_HEIGHT - BALL_SIZE) {
    ball.vy *= -1;
    ball.y = Math.max(0, Math.min(GAME_HEIGHT - BALL_SIZE, ball.y));
  }

  // Left paddle collision
  if (
    ball.x <= 0 &&
    ball.y >= gameState.paddles.player1 &&
    ball.y <= gameState.paddles.player1 + PADDLE_HEIGHT
  ) {
    ball.vx *= -1;
    ball.x = BALL_SIZE;
  }

  // Right paddle collision
  if (
    ball.x >= GAME_WIDTH - BALL_SIZE &&
    ball.y >= gameState.paddles.player2 &&
    ball.y <= gameState.paddles.player2 + PADDLE_HEIGHT
  ) {
    ball.vx *= -1;
    ball.x = GAME_WIDTH - BALL_SIZE;
  }

  // Score for player2
  if (ball.x < 0) {
    gameState.score.player2 += 1;
    resetBall(gameState, 1);
  }

  // Score for player1
  if (ball.x > GAME_WIDTH) {
    gameState.score.player1 += 1;
    resetBall(gameState, -1);
  }

  return gameState;
}

// Reset ball to center, set direction
function resetBall(gameState, direction) {
  gameState.ball.x = GAME_WIDTH / 2;
  gameState.ball.y = GAME_HEIGHT / 2;
  gameState.ball.vx = direction;
  gameState.ball.vy = direction;
}

export {
  movePaddle,
  moveBall,
  resetBall,
  GAME_WIDTH,
  GAME_HEIGHT,
  PADDLE_HEIGHT,
  BALL_SIZE,
  PADDLE_SPEED,
  BALL_SPEED,
};