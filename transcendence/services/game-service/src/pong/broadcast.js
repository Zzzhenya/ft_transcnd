
export function broadcastState(gameId, games) {
  const game = games.get(gameId);
  if (!game || game.clients.size === 0) return; // Skip if no clients

  // Create a clean game state without circular references (intervals)
  const cleanGameState = {
    score: game.state.score,
    ball: game.state.ball,
    paddles: game.state.paddles,
    tournament: {
      currentRound: game.state.tournament.currentRound,
      maxRounds: game.state.tournament.maxRounds,
      scoreLimit: game.state.tournament.scoreLimit,
      roundsWon: game.state.tournament.roundsWon,
      gameStatus: game.state.tournament.gameStatus,
      winner: game.state.tournament.winner,
      lastPointWinner: game.state.tournament.lastPointWinner,
      nextRoundCountdown: game.state.tournament.nextRoundCountdown,
      nextRoundNumber: game.state.tournament.nextRoundNumber
      // Exclude countdownInterval - it's not serializable
    }
    // Exclude gameLoopInterval - it's not serializable
  };

  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    gameId,               // include gameId
    player1_id: game.player1_id, // include player1_id
    player2_id: game.player2_id, // include player2_id
    player1_name: game.player1_name, // include player1_name
    player2_name: game.player2_name, // include player2_name
    gameType: game.gameType || 'normal', // include game type
    tournamentId: game.tournamentId || null, // include tournament ID if applicable
    isLocal: game.isLocal || false, // include local status
    isRegistered: game.isRegistered || false, // include registered status
    gameState: cleanGameState,
    winner_id: game.winner_id || null,
    final_score: game.final_score || null,
    created_at: game.created_at || null,
    finished_at: game.finished_at || null
  });

  const gameTypeLabel = game.isLocal ? 'LOCAL' : (game.gameType === 'tournament' ? 'TOURNAMENT' : 'NORMAL');
  console.log(
    `[Broadcast] Sending state to ${game.clients.size} clients in ${gameTypeLabel} game ${gameId}`
  );

  for (const ws of game.clients) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

