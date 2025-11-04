
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
        // ignore
      }
    }
  };
}
