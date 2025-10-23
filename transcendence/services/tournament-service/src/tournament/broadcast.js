// --- Helper: Broadcast to all clients in a tournament ---
export function broadcastTournamentUpdate(tournamentId) {
  const t = tournaments.get(tournamentId);
  if (!t || !t.clients) return;
  const data = {
    id: t.id,
    name: t.name,
    players: Array.from(t.playerSet),
    bracket: t.bracket,
    status: t.status,
  };
  for (const client of t.clients) {
    if (client.readyState === 1) { // 1 = OPEN
      client.send(JSON.stringify({ type: "tournament.update", data }));
    }
  }
}
