
export function broadcastState(gameId, games) {
  const game = games.get(gameId);
  if (!game || game.clients.size === 0) return; // Skip if no clients

  // Create a clean game state without circular references (intervals)
  const cleanGameState = {
    score: game.state?.score ?? null,
    ball: game.state?.ball ?? null,
    paddles: game.state?.paddles ?? null,
    tournament: {
      currentRound: game.state?.tournament?.currentRound ?? null,
      maxRounds: game.state?.tournament?.maxRounds ?? null,
      scoreLimit: game.state?.tournament?.scoreLimit ?? null,
      roundsWon: game.state?.tournament?.roundsWon ?? null,
      gameStatus: game.state?.tournament?.gameStatus ?? null,
      winner: game.state?.tournament?.winner ?? null,
      lastPointWinner: game.state?.tournament?.lastPointWinner ?? null,
      nextRoundCountdown: game.state?.tournament?.nextRoundCountdown ?? null,
      nextRoundNumber: game.state?.tournament?.nextRoundNumber ?? null
      // Exclude countdownInterval - it's not serializable
    }
    // Exclude gameLoopInterval - it's not serializable
  };

  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    gameId, // include gameId
    player1_id: game.player1_id ?? null, // include player1_id
    player2_id: game.player2_id ?? null, // include player2_id
    player1_name: game.player1_name ?? null, // include player1_name
    player2_name: game.player2_name ?? null, // include player2_name
    gameType: game.gameType ?? 'normal', // include game type
    tournamentId: game.tournamentId ?? null, // include tournament ID if applicable
    isLocal: !!game.isLocal, // include local status (force boolean)
    isRegistered: !!game.isRegistered, // include registered status (force boolean)
    gameState: cleanGameState,
    winner_id: game.winner_id ?? null,
    final_score: game.final_score ?? null,
    created_at: game.created_at ? new Date(game.created_at).toISOString() : null,
    finished_at: game.finished_at ? new Date(game.finished_at).toISOString() : null
  });

  const gameTypeLabel = game.isLocal ? 'LOCAL' : (game.gameType === 'tournament' ? 'TOURNAMENT' : 'NORMAL');
  console.log(
    `[Broadcast] Sending state to ${game.clients.size} clients in ${gameTypeLabel} game ${gameId}`
  );

for (const ws of Array.from(game.clients)) {
  if (ws.readyState === 1) {
    try {
      ws.send(payload);
    } catch (err) {
      console.error('[Broadcast] Failed to send to client', err);
      game.clients.delete(ws); // Remove faulty client
    }
  }
}
}

