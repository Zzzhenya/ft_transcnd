/**
 * Tournament Service Routes
 * 
 * OVERVIEW:
 * Handles all tournament-related API endpoints including:
 * - Tournament creation and listing
 * - Player management (join, add guests)
 * - Tournament start and bracket generation
 * - Match winner reporting and progression
 * - Tournament interruption handling
 * 
 * KEY ENDPOINTS:
 * 
 * GET /tournaments
 * - List all active tournaments (excludes finished)
 * - Returns tournament id, name, size, status, players
 * 
 * POST /tournaments/:id/start
 * - Start tournament with player list
 * - Generates bracket structure with rounds and matches
 * - Sets tournament status to 'active'
 * 
 * POST /tournaments/:id/advance
 * - Report match winner and advance to next round
 * - Updates bracket structure
 * - Checks if tournament is finished
 * 
 * POST /tournaments/:id/interrupt
 * - Mark match and tournament as interrupted
 * - Called when player exits during active match
 * - Prevents further matches from being played
 * - Sets both match.status and tournament.status to 'interrupted'
 * 
 * TOURNAMENT STATUS FLOW:
 * waiting → active → progressing → finished
 *                ↓
 *           interrupted (terminal state, no recovery)
 * 
 * INTERRUPTION SYSTEM:
 * - Frontend detects player exit during match (navigation, browser close)
 * - Sends interrupt request with keepalive flag
 * - Backend marks match and tournament as interrupted
 * - All clients receive broadcast update
 * - UI disables all match play buttons
 * - Tournament remains viewable but not playable
 */

export function registerTournamentRoutes(fastify, tournaments, broadcastTournamentUpdate) {
  // List all tournaments (exclude finished tournaments)
  fastify.get('/tournaments', async (req, reply) => {
    try {
      const list = Array.from(tournaments.values())
        .filter(t => t.status !== 'finished') // Filter out finished tournaments
        .map(t => ({
          id: t.id,
          name: t.name,
          size: t.size,
          status: t.status,
          players: Array.from(t.playerSet || [])
        }));
      return reply.send({ tournaments: list });
    } catch (err) {
      fastify.log.error('[TournamentService] Failed to list tournaments', err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Player list
  fastify.get('/tournaments/:id/players', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    reply.send({ players: Array.from(t.playerSet) });
  });

  // Get bracket
  fastify.get('/tournaments/:id/bracket', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    reply.send({ 
      bracket: t.bracket,
      size: t.size,
      status: t.status 
    });
  });

  // Start tournament
  fastify.post('/tournaments/:id/start', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) return reply.code(404).send({ error: 'Not found' });
    
    const { players, size } = req.body;
    if (!players || !Array.isArray(players)) {
      return reply.code(400).send({ error: 'Players array required' });
    }
    
    if (players.length !== size) {
      return reply.code(400).send({ error: `Need exactly ${size} players to start` });
    }

    // Clear playerSet and add all players from the request
    t.playerSet.clear();
    players.forEach(player => t.playerSet.add(player));
    
    // Generate bracket and start tournament
    const { generateBracket } = await import('../tournament/createBracket.js');
    t.bracket = generateBracket(Array.from(t.playerSet));
    t.status = 'progressing';
    
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, status: t.status, bracket: t.bracket });
  });

  // Advance winner
  fastify.post('/tournaments/:id/advance', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) {
      fastify.log.error(`Tournament ${req.params.id} not found`);
      return reply.code(404).send({ error: 'Not found' });
    }
    
    const { matchId, winner } = req.body;
    fastify.log.info(`Advance request: Tournament ${req.params.id}, Match ${matchId}, Winner ${winner}`);
    
    if (!t.playerSet.has(winner)) {
      fastify.log.error(`Invalid winner: ${winner} not in tournament`);
      return reply.code(400).send({ error: 'Invalid winner' });
    }

    // Find and update the match with the winner
    let currentMatch = null;
    let currentRoundIndex = -1;
    for (let i = 0; i < t.bracket.rounds.length; i++) {
      const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
      if (match) {
        match.winner = winner;
        match.status = 'completed';
        currentMatch = match;
        currentRoundIndex = i;
        fastify.log.info(`Match ${matchId} found in round ${i}, setting winner to ${winner}`);
        break;
      }
    }

    if (!currentMatch) {
      fastify.log.error(`Match ${matchId} not found in tournament bracket`);
      return reply.code(404).send({ error: 'Match not found' });
    }

    // Advance winner to next round
    if (currentRoundIndex < t.bracket.rounds.length - 1) {
      const nextRound = t.bracket.rounds[currentRoundIndex + 1];
      for (const nextMatch of nextRound) {
        if (nextMatch.prevMatch1 === matchId) {
          nextMatch.player1 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player1`);
        } else if (nextMatch.prevMatch2 === matchId) {
          nextMatch.player2 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player2`);
        }
      }
    }

    // Check if tournament is finished (final match has a winner)
    const finalMatch = t.bracket.rounds.at(-1)[0];
    if (finalMatch.winner) {
      t.status = 'finished';
      fastify.log.info(`🏆 Tournament ${req.params.id} FINISHED! Winner: ${finalMatch.winner}`);
    } else {
      t.status = 'progressing';
    }
    fastify.log.info(`Tournament status: ${t.status}`);
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, bracket: t.bracket, status: t.status });
  });

  /**
   * POST /tournaments/:id/interrupt
   * 
   * PURPOSE:
   * Mark a match and the entire tournament as interrupted
   * Called when a player exits during active gameplay
   * 
   * WORKFLOW:
   * 1. Frontend detects player navigation/exit during active match
   * 2. Frontend sends POST with matchId and reason
   * 3. Backend finds match in bracket and marks as 'interrupted'
   * 4. Backend marks entire tournament status as 'interrupted'
   * 5. Broadcast update to all connected clients
   * 6. No further matches can be played in this tournament
   * 
   * REQUEST BODY:
   * - matchId: string (e.g., "R1M1" - Round 1 Match 1)
   * - reason: string (e.g., "player_left", "connection_timeout")
   * 
   * EFFECTS:
   * - match.status = 'interrupted'
   * - match.interruptReason = reason
   * - tournament.status = 'interrupted'
   * - Tournament becomes read-only (no new matches can start)
   * 
   * UI IMPLICATIONS:
   * - Frontend disables all "Play Match" buttons
   * - Shows red banner: "TOURNAMENT INTERRUPTED"
   * - Lobby shows tournament with "VIEW ONLY" button
   */
  fastify.post('/tournaments/:id/interrupt', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) {
      fastify.log.error(`Tournament ${req.params.id} not found`);
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    const { matchId, reason } = req.body;
    if (!matchId) {
      return reply.code(400).send({ error: 'matchId is required' });
    }

    // Find the match in the bracket
    let matchFound = false;
    for (let i = 0; i < t.bracket.rounds.length; i++) {
      const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
      if (match) {
        match.status = 'interrupted';
        match.interruptReason = reason || 'connection_timeout';
        matchFound = true;
        fastify.log.warn(`⚠️ Match ${matchId} in tournament ${req.params.id} marked as interrupted: ${reason}`);
        break;
      }
    }

    if (!matchFound) {
      fastify.log.error(`Match ${matchId} not found in tournament ${req.params.id}`);
      return reply.code(404).send({ error: 'Match not found' });
    }

    // Mark entire tournament as interrupted - prevents any further matches
    t.status = 'interrupted';
    fastify.log.warn(`⚠️ Tournament ${req.params.id} marked as INTERRUPTED`);
    
    // Notify all clients about the interruption
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, status: t.status, matchId });
  });

  // Forfeit match (player left)
  fastify.post('/tournaments/:id/forfeit', async (req, reply) => {
    const t = tournaments.get(Number(req.params.id));
    if (!t) {
      fastify.log.error(`Tournament ${req.params.id} not found`);
      return reply.code(404).send({ error: 'Tournament not found' });
    }

    const { matchId, winner, reason } = req.body;
    if (!matchId || !winner) {
      return reply.code(400).send({ error: 'matchId and winner are required' });
    }

    // Find and update the match with the winner
    let currentMatch = null;
    let currentRoundIndex = -1;
    for (let i = 0; i < t.bracket.rounds.length; i++) {
      const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
      if (match) {
        match.winner = winner;
        match.status = 'forfeited';
        match.forfeitReason = reason || 'player_left';
        currentMatch = match;
        currentRoundIndex = i;
        fastify.log.warn(`⚠️ Match ${matchId} forfeited, ${winner} wins by forfeit: ${reason}`);
        break;
      }
    }

    if (!currentMatch) {
      fastify.log.error(`Match ${matchId} not found in tournament bracket`);
      return reply.code(404).send({ error: 'Match not found' });
    }

    // Advance winner to next round
    if (currentRoundIndex < t.bracket.rounds.length - 1) {
      const nextRound = t.bracket.rounds[currentRoundIndex + 1];
      for (const nextMatch of nextRound) {
        if (nextMatch.prevMatch1 === matchId) {
          nextMatch.player1 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player1`);
        } else if (nextMatch.prevMatch2 === matchId) {
          nextMatch.player2 = winner;
          fastify.log.info(`Advanced ${winner} to match ${nextMatch.matchId} as player2`);
        }
      }
    }

    // Check if tournament is finished (final match has a winner)
    const finalMatch = t.bracket.rounds.at(-1)[0];
    if (finalMatch.winner) {
      t.status = 'finished';
      fastify.log.info(`🏆 Tournament ${req.params.id} FINISHED! Winner: ${finalMatch.winner} (by forfeit)`);
    } else {
      t.status = 'progressing';
    }
    
    fastify.log.info(`Tournament status: ${t.status}`);
    broadcastTournamentUpdate(t.id);
    reply.send({ ok: true, bracket: t.bracket, status: t.status });
  });
}
