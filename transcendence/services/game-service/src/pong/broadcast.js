
export function broadcastState(gameId, games) {
  const game = games.get(gameId);
  if (!game) return;

  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    gameId,               // include gameId
    player1_id: game.player1_id, // include player1_id
    player2_id: game.player2_id, // include player2_id
    player1_name: game.player1_name, // include player1_name
    player2_name: game.player2_name, // include player2_name
    gameType: game.gameType || 'normal', // include game type
    tournamentId: game.tournamentId || null, // include tournament ID if applicable
    isDemo: game.isDemo || false, // include demo status
    isRegistered: game.isRegistered || false, // include registered status
    gameState: game.state,
    winner_id: game.winner_id || null,
    final_score: game.final_score || null,
    created_at: game.created_at || null,
    finished_at: game.finished_at || null
  });

  const gameTypeLabel = game.isDemo ? 'DEMO' : (game.gameType === 'tournament' ? 'TOURNAMENT' : 'NORMAL');
  console.log(
    `[Broadcast] Sending state to ${game.clients.size} clients in ${gameTypeLabel} game ${gameId}`
  );

  for (const ws of game.clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

