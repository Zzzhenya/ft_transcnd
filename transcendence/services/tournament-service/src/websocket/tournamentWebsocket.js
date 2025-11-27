
import logger from '../utils/logger.js';

export function registerWebSocketRoute(fastify, tournaments) {
  fastify.get('/ws/tournament/:id', { websocket: true }, (connection, req) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) {
      logger.warn('WebSocket connection for unknown tournament, closing', { tournamentId: req.params.id });
      try { connection.socket.close(); } catch (e) { /* ignore */ }
      return;
    }
    t.clients.add(connection.socket);
    logger.info('WebSocket client connected to tournament', { tournamentId: t.id, clients: t.clients.size });

    // Send initial data
    try {
      connection.socket.send(
        JSON.stringify({
          type: 'tournament.update',
          data: {
            id: t.id,
            name: t.name,
            players: Array.from(t.playerSet),
            bracket: t.bracket,
            status: t.status,
          },
        })
      );
    } catch (err) {
      logger.warn('Failed to send initial tournament snapshot to client', { tournamentId: t.id, err: err && err.message ? err.message : String(err) });
    }

    connection.socket.on('close', () => {
      t.clients.delete(connection.socket);
      logger.debug('WebSocket client disconnected from tournament', { tournamentId: t.id, clients: t.clients.size });
    });
  });
}