// services/game-service/src/pong/gameLogic3d.js
// 3D Authoritative Game Logic (X–Z plane)
export function initialGameState3D() {
  return {
    score: { player1: 0, player2: 0 },
    ball: { x: 0, z: 0, dx: 6, dz: 0 },     // y는 시각화 전용. 물리는 X–Z만
    paddles: { player1Z: 0, player2Z: 0 },
    bounds: { x: 9, z: 5 },                  // 득점/반사 경계(절반 크기)
    tournament: {
      currentRound: 1,
      maxRounds: 3,
      scoreLimit: 5,
      roundsWon: { player1: 0, player2: 0 },
      gameStatus: 'waiting', // 'waiting' | 'playing' | 'roundEnd' | 'gameEnd' | 'roundCountdown'
      winner: null,
      nextRoundCountdown: 0,
      countdownInterval: null
    },
    gameLoopInterval: null
  };
}

export function movePaddle3D(state, player, direction) {
  const speed = 15; // units/s per tick 변환은 루프에서
  const top = -state.bounds.z + 0.8;
  const bottom = state.bounds.z - 0.8;

  const key = player === 'player1' ? 'player1Z' : 'player2Z';
  const sign = direction === 'up' ? -1 : +1;  // 카메라 기준 위=Z-
  state.paddles[key] = Math.max(top, Math.min(bottom, state.paddles[key] + sign * speed / TICKS_PER_SEC));
}

export function resetBallToward(state, to) {
  state.ball.x = 0;
  state.ball.z = 0;
  const base = 6;
  state.ball.dx = (to === 'right' ? +base : -base);
  state.ball.dz = (Math.random() - 0.5) * base * 0.8;
}

export function startGame3D(state) {
  state.tournament.gameStatus = 'playing';
  resetBallToward(state, Math.random() > 0.5 ? 'left' : 'right');
}

export function restartGame3D(state) {
  clearCountdown(state);
  if (state.gameLoopInterval) clearInterval(state.gameLoopInterval);
  state.score.player1 = 0;
  state.score.player2 = 0;
  state.paddles.player1Z = 0;
  state.paddles.player2Z = 0;
  state.tournament.currentRound = 1;
  state.tournament.roundsWon.player1 = 0;
  state.tournament.roundsWon.player2 = 0;
  state.tournament.winner = null;
  state.tournament.gameStatus = 'waiting';
  resetBallToward(state, 'right');
}

function clearCountdown(state) {
  if (state.tournament.countdownInterval) {
    clearInterval(state.tournament.countdownInterval);
    state.tournament.countdownInterval = null;
  }
}

export function cleanupGame3D(state) {
  clearCountdown(state);
  if (state.gameLoopInterval) {
    clearInterval(state.gameLoopInterval);
    state.gameLoopInterval = null;
  }
}

export const TICKS_PER_SEC = 30;

export function startGameLoop3D(state, broadcast, hasClients) {
  const paddleHalf = 1.0;
  const maxV = 14;

  function score(who) {
    state.score[who]++;
    const roundsToWin = Math.ceil(state.tournament.maxRounds / 2);

    // 라운드 종료?
    if (state.score[who] >= state.tournament.scoreLimit) {
      state.tournament.roundsWon[who]++;
      // 게임 종료?
      if (state.tournament.roundsWon[who] >= roundsToWin) {
        state.tournament.gameStatus = 'gameEnd';
        state.tournament.winner = who;
        broadcast();
        return;
      }
      // 다음 라운드 카운트다운
      state.tournament.gameStatus = 'roundCountdown';
      state.tournament.nextRoundCountdown = 3;
      state.tournament.currentRound++;
      clearCountdown(state);
      state.tournament.countdownInterval = setInterval(() => {
        state.tournament.nextRoundCountdown--;
        broadcast();
        if (state.tournament.nextRoundCountdown <= 0) {
          clearCountdown(state);
          state.score.player1 = 0;
          state.score.player2 = 0;
          state.paddles.player1Z = 0;
          state.paddles.player2Z = 0;
          state.tournament.gameStatus = 'playing';
          resetBallToward(state, who === 'player1' ? 'left' : 'right'); // 이전 득점자 반대 방향
        }
      }, 1000);
      broadcast();
      return;
    }
    // 다음 랠리
    resetBallToward(state, who === 'player1' ? 'left' : 'right');
  }

  const interval = setInterval(() => {
    if (!hasClients()) return; // 클라 없으면 쉬어 CPU 세이브

    if (state.tournament.gameStatus !== 'playing') {
      broadcast();
      return;
    }

    // 공 이동
    state.ball.x += state.ball.dx / TICKS_PER_SEC;
    state.ball.z += state.ball.dz / TICKS_PER_SEC;

    // Z 경계 반사
    if (state.ball.z > state.bounds.z || state.ball.z < -state.bounds.z) {
      state.ball.dz *= -1;
      state.ball.z = Math.max(-state.bounds.z, Math.min(state.bounds.z, state.ball.z));
    }

    // 패들 위치 (양 끝 x 고정)
    const leftX = -state.bounds.x + 1;
    const rightX = state.bounds.x - 1;

    // 왼쪽 패들 충돌
    if (state.ball.dx < 0 &&
        state.ball.x <= leftX + 0.4 && state.ball.x >= leftX - 0.4 &&
        Math.abs(state.ball.z - state.paddles.player1Z) <= paddleHalf) {
      state.ball.dx = Math.abs(state.ball.dx) * 1.05;
      const offset = (state.ball.z - state.paddles.player1Z) / paddleHalf;
      state.ball.dz += offset * 0.8;
    }
    // 오른쪽 패들 충돌
    if (state.ball.dx > 0 &&
        state.ball.x >= rightX - 0.4 && state.ball.x <= rightX + 0.4 &&
        Math.abs(state.ball.z - state.paddles.player2Z) <= paddleHalf) {
      state.ball.dx = -Math.abs(state.ball.dx) * 1.05;
      const offset = (state.ball.z - state.paddles.player2Z) / paddleHalf;
      state.ball.dz += offset * 0.8;
    }

    // 속도 제한
    state.ball.dx = Math.max(-maxV, Math.min(maxV, state.ball.dx));
    state.ball.dz = Math.max(-maxV, Math.min(maxV, state.ball.dz));

    // 득점 (X 경계)
    if (state.ball.x > state.bounds.x + 0.5) {
      score('player1');
    } else if (state.ball.x < -state.bounds.x - 0.5) {
      score('player2');
    }

    broadcast();
  }, 1000 / TICKS_PER_SEC);

  state.gameLoopInterval = interval;
  return interval;
}
