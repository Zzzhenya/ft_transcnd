/**
 * broadcast.js
 *
 * Responsible for broadcasting tournament updates to connected WebSocket
 * clients. Exports a small factory `createBroadcast(tournaments)` which
 * returns a `broadcastTournamentUpdate(tournamentId)` function bound to the
 * provided tournaments Map.
 *
 * Behavior:
 * - Serializes a compact tournament snapshot (id, name, players, bracket,
 *   status) and sends it to all open clients.
 * - Cleans up dead/closed clients from the tournament's client Set.
 */
import logger from '../utils/logger.js';

export function createBroadcast(tournaments) {
  return function broadcastTournamentUpdate(tournamentId) {
    const t = tournaments.get(tournamentId);
    if (!t || !t.clients) return;

    const data = {
      id: t.id,
      name: t.name,
      players: Array.from(t.playerSet),
      bracket: t.bracket,
      status: t.status,
    };
    // Pre-stringify payload to avoid repeated work per client
    const message = JSON.stringify({ type: 'tournament.update', data });

    // Track clients to remove after iteration to avoid mutating the set while iterating
    const toRemove = [];

    for (const client of t.clients) {
      try {
        // readyState === 1 means OPEN in WebSocket API
        if (client && client.readyState === 1) {
          client.send(message);
        } else {
          // Not open -> schedule removal
          toRemove.push(client);
        }
      } catch (err) {
        // If send fails, log and schedule client cleanup
        logger.warn('Failed to send tournament update to client, scheduling removal', { tournamentId, err: err && err.message ? err.message : String(err) });
        try {
          // fast fail: if client has terminate or close prefer terminating
          if (typeof client.terminate === 'function') client.terminate();
          else if (typeof client.close === 'function') client.close();
        } catch (e) {
          // ignore
        }
        toRemove.push(client);
      }
    }

    // Remove closed/errored clients from the set
    for (const c of toRemove) {
      try {
        t.clients.delete(c);
      } catch (e) {
        logger.warn('Failed to remove client from tournament client set', { tournamentId, err: e && e.message ? e.message : String(e) });
      }
    }
  };
}
