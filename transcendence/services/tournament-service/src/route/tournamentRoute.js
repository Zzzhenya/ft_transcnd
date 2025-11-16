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
import {
  insertTournamentPlayers,
  insertTournamentMatches,
  updateMatchFields,
  toDbTimestamp,
} from '../tournament/createTournament.js';


export function registerTournamentRoutes(fastify, tournaments, broadcastTournamentUpdate) {
  // List all tournaments (exclude finished tournaments)
  fastify.get('/tournaments', async (req, reply) => {
    try {
      const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
      const now = Date.now();
      
      const list = Array.from(tournaments.values())
        .filter(t => {
          // Hide finished tournaments older than 5 minutes
          if (t.status === 'finished' && t.finishedAt) {
            const age = now - t.finishedAt;
            if (age > FIVE_MINUTES) {
              return false; // Hide but DON'T delete
            }
          }
          
          // Hide interrupted tournaments older than 5 minutes
          if (t.status === 'interrupted' && t.interruptedAt) {
            const age = now - t.interruptedAt;
            if (age > FIVE_MINUTES) {
              return false; // Hide but DON'T delete
            }
          }
          
          return true; // Show all other tournaments (waiting, in_progress, recent finished/interrupted)
        })
        .map(t => ({
          id: t.id,
          dbId: t.dbId ?? null,
          name: t.name,
          size: t.size,
          status: t.status,
          players: Array.from(t.playerSet || []),
          createdBy: t.createdBy ?? null,
          createdAt: t.createdAt ?? null,
          interruptedAt: t.interruptedAt, // Include timestamp for countdown
          finishedAt: t.finishedAt // Include timestamp for countdown
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

  const { players, size } = req.body || {};

  // players can be strings OR { alias, userId }
  if (!Array.isArray(players) || players.length === 0) {
    return reply.code(400).send({ error: 'Players array required' });
  }

  if (players.length !== size) {
    return reply.code(400).send({ error: `Need exactly ${size} players to start` });
  }

  // Normalize to [{ alias, userId }]
  const normalizedPlayers = players.map(p => {
    if (typeof p === 'string') {
      return { alias: p, userId: null };
    }
    return {
      alias: p.alias,
      userId: p.userId ?? null,
    };
  });

  // Use aliases (names) for in-memory bracket + playerSet
  const aliases = normalizedPlayers.map(p => p.alias);

  t.playerSet = new Set(aliases);
  t.players = normalizedPlayers; // keep full info in memory for later if needed

  // Generate bracket and start tournament
  const { generateBracket } = await import('../tournament/createBracket.js');
  t.bracket = generateBracket(aliases);
  t.status = 'progressing';
  t.startedAt = t.startedAt || new Date().toISOString();

  // Persist Tournament snapshot + players + matches
  if (typeof t.syncSnapshot === 'function') {
    try {
      await t.syncSnapshot();
    } catch (err) {
      fastify.log.error(
        { err, tournamentId: t.id },
        '[TournamentService] Failed to persist bracket snapshot on start'
      );
    }
  }

  // IMPORTANT: Insert into Tournament_Players and Matches_Tournament
  if (t.dbId) {
    try {
      await insertTournamentPlayers(t.dbId, normalizedPlayers);
      await insertTournamentMatches(t.dbId, t.bracket, normalizedPlayers);
    } catch (err) {
      fastify.log.error(
        { err, tournamentId: t.id },
        '[TournamentService] Failed to insert players/matches into DB'
      );
      // You *can* choose to reply 500 here instead, but for now we just log.
    }
  } else {
    fastify.log.error(
      { tournamentId: t.id },
      '[TournamentService] Missing dbId, cannot insert players/matches'
    );
  }

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
  
  const { matchId, winner, player1Score, player2Score } = req.body; // scores optional
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

  // ⬇️⬇️ THIS IS THE "WHEN YOU UPDATE THE MATCH IN MEMORY, ALSO PERSIST TO DB" PART ⬇️⬇️

  // set timestamps in memory
  const nowIso = new Date().toISOString();
  currentMatch.finishedAt = nowIso;

  // find winner userId using t.players (alias -> userId)
  let winnerUserId = null;
  if (Array.isArray(t.players)) {
    const winnerPlayer = t.players.find(p => p.alias === winner);
    winnerUserId = winnerPlayer?.userId ?? null;
  }

  try {
    if (currentMatch.dbId) {
      await updateMatchFields(currentMatch.dbId, {
        winner_id: winnerUserId,
        winner_username: winner,
        status: currentMatch.status,
        player1_score: player1Score ?? null,   // or keep previous value
        player2_score: player2Score ?? null,
        started_at: toDbTimestamp(currentMatch.startedAt),
        finished_at: toDbTimestamp(currentMatch.finishedAt),
      });
    } else {
      fastify.log.warn(
        { matchId, tournamentId: t.id },
        '[TournamentService] Match has no dbId, skipping DB update'
      );
    }
  } catch (err) {
    fastify.log.error(
      { err, tournamentId: t.id, matchId },
      '[TournamentService] Failed to update match result in DB'
    );
  }

  // ⬆️⬆️ END OF NEW BLOCK ⬆️⬆️

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
    t.finishedAt = Date.now(); // still using ms timestamp for in-memory
    t.winnerUsername = finalMatch.winner;

    let winnerUserId = null;
    if (Array.isArray(t.players)) {
      const winnerPlayer = t.players.find(p => p.alias === finalMatch.winner);
      winnerUserId = winnerPlayer?.userId ?? null;
    }
    t.winnerId = winnerUserId;

    fastify.log.info(`🏆 Tournament ${req.params.id} FINISHED! Winner: ${finalMatch.winner}`);
  } else {
    t.status = 'progressing';
  }

  if (typeof t.syncSnapshot === 'function') {
    try {
      await t.syncSnapshot();
    } catch (err) {
      fastify.log.error({ err, tournamentId: t.id }, '[TournamentService] Failed to persist snapshot after advance');
    }
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
  let currentMatch = null;
  for (let i = 0; i < t.bracket.rounds.length; i++) {
    const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
    if (match) {
      match.status = 'interrupted';
      match.interruptReason = reason || 'connection_timeout';
      currentMatch = match;
      fastify.log.warn(`⚠️ Match ${matchId} in tournament ${req.params.id} marked as interrupted: ${reason}`);
      break;
    }
  }

  if (!currentMatch) {
    fastify.log.error(`Match ${matchId} not found in tournament ${req.params.id}`);
    return reply.code(404).send({ error: 'Match not found' });
  }

  // ⬇️ NEW: persist interrupted status to Matches_Tournament
  try {
    if (currentMatch.dbId) {
      const finishedAtIso = new Date().toISOString();
      await updateMatchFields(currentMatch.dbId, {
        status: 'interrupted',
        finished_at: toDbTimestamp(finishedAtIso),
      });
    } else {
      fastify.log.warn(
        { matchId, tournamentId: t.id },
        '[TournamentService] Interrupted match has no dbId, skipping DB update'
      );
    }
  } catch (err) {
    fastify.log.error(
      { err, tournamentId: t.id, matchId },
      '[TournamentService] Failed to update interrupted match in DB'
    );
  }

  // Mark entire tournament as interrupted - prevents any further matches
  t.status = 'interrupted';
  if(!t.finishedAt)
  {
    t.finishedAt = Date.now();
  }
  t.interruptedAt = Date.now(); // Store timestamp for 5-minute countdown
  fastify.log.warn(`⚠️ Tournament ${req.params.id} marked as INTERRUPTED at ${new Date(t.interruptedAt).toISOString()}`);

  if (typeof t.syncSnapshot === 'function') {
    try {
      await t.syncSnapshot();
    } catch (err) {
      fastify.log.error({ err, tournamentId: t.id }, '[TournamentService] Failed to persist snapshot after interrupt');
    }
  }
  
  broadcastTournamentUpdate(t.id);
  reply.send({ ok: true, status: t.status, matchId, interruptedAt: t.interruptedAt });
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

  // 1️⃣ Find and update the match in memory
  let currentMatch = null;
  let currentRoundIndex = -1;

  for (let i = 0; i < t.bracket.rounds.length; i++) {
    const match = t.bracket.rounds[i].find(m => m.matchId === matchId);
    if (match) {
      match.winner = winner;
      match.winnerUsername = winner;
      match.status = 'forfeited';
      match.forfeitReason = reason || 'player_left';
      currentMatch = match;
      currentRoundIndex = i;
      fastify.log.warn(
        `⚠️ Match ${matchId} forfeited, ${winner} wins by forfeit: ${reason}`
      );
      break;
    }
  }

  if (!currentMatch) {
    fastify.log.error(`Match ${matchId} not found in tournament bracket`);
    return reply.code(404).send({ error: 'Match not found' });
  }

  // 2️⃣ Set timestamps in memory
  const nowIso = new Date().toISOString();
  if (!currentMatch.startedAt) {
    currentMatch.startedAt = nowIso;
  }
  currentMatch.finishedAt = nowIso;

  // 3️⃣ Find winner userId (alias -> userId) using t.players
  let winnerUserId = null;
  if (Array.isArray(t.players)) {
    const winnerPlayer = t.players.find(p => p.alias === winner);
    winnerUserId = winnerPlayer?.userId ?? null;
  }

  // 4️⃣ Persist forfeited match to Matches_Tournament
  try {
    if (currentMatch.dbId) {
      await updateMatchFields(currentMatch.dbId, {
        winner_id: winnerUserId,
        status: currentMatch.status,         // 'forfeited'
        // If you have scores at time of forfeit, put them here instead of null:
        player1_score: null,
        player2_score: null,
        started_at: toDbTimestamp(currentMatch.startedAt),
        finished_at: toDbTimestamp(currentMatch.finishedAt),
      });
    } else {
      fastify.log.warn(
        { matchId, tournamentId: t.id },
        '[TournamentService] Forfeited match has no dbId, skipping DB update'
      );
    }
  } catch (err) {
    fastify.log.error(
      { err, tournamentId: t.id, matchId },
      '[TournamentService] Failed to update forfeited match in DB'
    );
  }

  // 5️⃣ Advance winner to next round (same as /advance)
  if (currentRoundIndex < t.bracket.rounds.length - 1) {
    const nextRound = t.bracket.rounds[currentRoundIndex + 1];
    for (const nextMatch of nextRound) {
      if (nextMatch.prevMatch1 === matchId) {
        nextMatch.player1 = winner;
        fastify.log.info(
          `Advanced ${winner} to match ${nextMatch.matchId} as player1 (forfeit)`
        );
      } else if (nextMatch.prevMatch2 === matchId) {
        nextMatch.player2 = winner;
        fastify.log.info(
          `Advanced ${winner} to match ${nextMatch.matchId} as player2 (forfeit)`
        );
      }
    }
  }

  // 6️⃣ Check if tournament is finished (final match has a winner)
  const finalMatch = t.bracket.rounds.at(-1)[0];
  if (finalMatch.winner) {
    t.status = 'finished';
    t.finishedAt = Date.now();         // in-memory ms timestamp
    t.winnerUsername = finalMatch.winner;

    // also store winnerId so syncTournamentSnapshot can write winner_id
    let finalWinnerUserId = null;
    if (Array.isArray(t.players)) {
      const winnerPlayer = t.players.find(p => p.alias === finalMatch.winner);
      finalWinnerUserId = winnerPlayer?.userId ?? null;
    }
    t.winnerId = finalWinnerUserId;

    fastify.log.info(
      `🏆 Tournament ${req.params.id} FINISHED! Winner: ${finalMatch.winner} (by forfeit)`
    );
  } else {
    t.status = 'progressing';
  }

  // 7️⃣ Sync Tournament row + metadata
  if (typeof t.syncSnapshot === 'function') {
    try {
      await t.syncSnapshot();
    } catch (err) {
      fastify.log.error(
        { err, tournamentId: t.id },
        '[TournamentService] Failed to persist snapshot after forfeit'
      );
    }
  }

  fastify.log.info(`Tournament status: ${t.status}`);
  broadcastTournamentUpdate(t.id);
  reply.send({ ok: true, bracket: t.bracket, status: t.status });
});
}