// services/game-service/src/Routes/gameRoute3d.js
import {
  initialGameState3D,
  movePaddle3D,
  startGame3D,
  restartGame3D,
  startGameLoop3D,
} from "../pong/gameLogic3d.js";

// fastify-websocket만 사용 (추가 의존성 없음)
export function registerSingleGameRoutes(fastify, games, counters, _wrappedBroadcastState) {
  // ───────────────────────────
  // WS: /ws/pong/game-ws/:gameId (route 방식)
  // ───────────────────────────
  fastify.get('/ws/pong/game-ws/:gameId', { websocket: true }, (conn, req) => {
    const gameId = Number(req.params.gameId);
    const game = games.get(gameId);
    if (!game) return conn.socket.close();

    // 클라이언트 세트 준비
    if (!game.clients) game.clients = new Set();
    game.clients.add(conn.socket);

    // 최초 상태 브로드캐스트
    broadcastState(gameId);

    conn.socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'START_GAME') {
          startGame3D(game.state);
        } else if (msg.type === 'RESTART_GAME') {
          restartGame3D(game.state);
        } else if (msg.type === 'MOVE_PADDLE') {
          const { player, direction } = msg;
          if (player && direction) movePaddle3D(game.state, player, direction);
        }
      } catch (e) {
        fastify.log.error(e);
      }
    });

    conn.socket.on('close', () => {
      game.clients.delete(conn.socket);
    });
  });

  function hasClients(gameId) {
    const g = games.get(gameId);
    return !!g && g.clients && g.clients.size > 0;
  }

  function broadcastState(gameId) {
    const g = games.get(gameId);
    if (!g || !g.clients) return;

    const payload = JSON.stringify({
      type: 'STATE_UPDATE',
      gameState: {
        ball:    { x: g.state.ball.x, z: g.state.ball.z },
        paddles: { player1Z: g.state.paddles.player1Z, player2Z: g.state.paddles.player2Z },
        score:   g.state.score,
        bounds:  g.state.bounds,
        tournament: g.state.tournament,
      },
      meta: { gameId, player1_name: g.player1_name, player2_name: g.player2_name },
    });

    for (const s of g.clients) {
      if (s.readyState === 1) s.send(payload); // OPEN
    }
  }

  // ───────────────────────────
  // REST: 게임 생성 (WS URL 하드코딩 유지)
  // ───────────────────────────
  fastify.post('/ws/pong/game', async (req, reply) => {
    try {
      const { player1_id, player1_name, player2_id, player2_name } = req.body ?? {};
      if (!player1_id || !player1_name) return reply.code(400).send({ error: 'player1_id and player1_name are required' });

      const id = counters.nextGameId++;
      const state = initialGameState3D();

      const game = {
        id,
        state,
        clients: new Set(),
        player1_id: Number(player1_id),
        player2_id: player2_id ? Number(player2_id) : null,
        player1_name: String(player1_name),
        player2_name: player2_name ? String(player2_name) : null,
        status: player2_id ? 'ready' : 'waiting_for_player',
        createdAt: new Date(),
      };
      games.set(id, game);

      // 서버 권위 루프 시작
      startGameLoop3D(state, () => broadcastState(id), () => hasClients(id));

      // 요구사항: 하드코딩된 WS 주소 사용
      const websocketUrl = `ws://localhost:3002/ws/pong/game-ws/${id}`;

      return reply.code(201).send({ id, websocketUrl, message: '3D game created (authoritative server)' });
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ error: 'create failed' });
    }
  });

  // (선택) REST 컨트롤
  fastify.post('/ws/pong/game/:gameId/start', (req, reply) => {
    const g = games.get(Number(req.params.gameId));
    if (!g) return reply.code(404).send({ error: 'not found' });
    startGame3D(g.state);
    reply.send({ ok: true });
  });

  fastify.post('/ws/pong/game/:gameId/restart', (req, reply) => {
    const g = games.get(Number(req.params.gameId));
    if (!g) return reply.code(404).send({ error: 'not found' });
    restartGame3D(g.state);
    reply.send({ ok: true });
  });
}
