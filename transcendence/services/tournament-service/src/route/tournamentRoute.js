// --- Get player list ---
export function getPlayerList(tournamentId) {
fastify.get('/tournaments/:id/players', async (request, reply) => {
  const t = tournaments.get(Number(request.params.id));
  if (!t) return reply.code(404).send({ error: "Not found" });
  reply.send({ players: Array.from(t.playerSet) });
});
}

// --- Get bracket ---
export function getBracket(tournamentId) {
fastify.get('/tournaments/:id/bracket', async (request, reply) => {
  const t = tournaments.get(Number(request.params.id));
  if (!t) return reply.code(404).send({ error: "Not found" });
  reply.send({ bracket: t.bracket });
});
}

// --- Advance winner (simulate match result) ---
export function advanceWinner(tournamentId, matchId, winner) {
fastify.post('/tournaments/:id/advance', async (request, reply) => {
  const t = tournaments.get(Number(request.params.id));
  if (!t) return reply.code(404).send({ error: "Not found" });
  const { matchId, winner } = request.body;
  if (!t.playerSet.has(winner)) return reply.code(400).send({ error: "Invalid winner" });
  advanceWinner(t.bracket, matchId, winner);
  // Optionally update status
  t.status = t.bracket.rounds.at(-1)[0].winner ? "finished" : "in_progress";
  broadcastTournamentUpdate(t.id);
  reply.send({ ok: true });
});
}
