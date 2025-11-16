
import { generateBracket } from './createBracket.js';

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';

async function persistTournamentRecord({ serviceTournamentId, name, creatorName, creatorId, size }) {
    // Build tournament metadata object
    // Contains serviceTournamentId, creator info, initial player list, matches, status, timestamps
  const metadata = {
    serviceTournamentId,
    creator: {
      name: creatorName,
      id: creatorId ?? null,
    },
    players: [
      {
        name: creatorName,
        userId: creatorId ?? null,
        role: 'creator',
      },
    ],
    matches: [],
    status: 'ready',
    createdAt: new Date().toISOString(),
    finishedAt: null,
  };

    // Prepare payload for database insert
    // Inserts a new row into Tournament with metadata as description
  const payload = {
    table: 'Tournament',
    action: 'insert',
    values: {
      name,
      description: JSON.stringify(metadata),
      player_count: size,
      current_players: 1,
      status: 'ready',
    },
  };

    // Send POST request to database-service to insert tournament
  const response = await fetch(`${DATABASE_SERVICE_URL}/internal/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-auth': DB_SERVICE_TOKEN,
    },
    body: JSON.stringify(payload),
  });

    // If response is not OK, throw error with details
  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to persist tournament: ${response.status} ${errorText}`);
  }

    // Parse response and extract inserted row id
    // Uses result.id (now mapped to lastInsertRowid by database-service)
  const result = await response.json();
  const dbId = result?.id ?? result?.lastInsertRowid ?? result?.lastID ?? null;
  if (!dbId) {
    console.error('[TournamentService] DB response missing id field:', result);
    throw new Error('Database response missing tournament id');
  }

    // Return the new tournament's database id and metadata
  return { dbId, metadata };
}

// Helper: insert one row into Tournament_Players
async function insertTournamentPlayerRow({ tournamentId, userId, alias }) {
  const payload = {
    table: 'Tournament_Players',
    action: 'insert',
    values: {
      tournament_id: tournamentId,
      user_id: userId,              // can be null for guests
      tournament_alias: alias,
    },
  };

  const response = await fetch(`${DATABASE_SERVICE_URL}/internal/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-auth': DB_SERVICE_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to insert tournament player: ${response.status} ${errorText}`
    );
  }
}

// Public: insert all players for a tournament
// players = [{ alias, userId }, ...]
export async function insertTournamentPlayers(tournamentId, players) {
  const inserts = players.map(p =>
    insertTournamentPlayerRow({
      tournamentId,
      userId: p.userId ?? null,
      alias: p.alias,
    })
  );
  await Promise.all(inserts);
}
// Helper: insert one row into Matches_Tournament
async function insertMatchRow({
  tournamentId,
  round,
  matchNumber,
  player1Alias,
  player2Alias,
  player1Id,
  player2Id,
}) {
  const payload = {
    table: 'Matches_Tournament',
    action: 'insert',
    values: {
      tournament_id: tournamentId,
      round,
      match_number: matchNumber,
      // IDs can be null (guests / TBD)
      player1_id: player1Id,
      player2_id: player2Id,
      // ✅ new alias columns (must be included explicitly)
      player1_alias: player1Alias ?? null,
      player2_alias: player2Alias ?? null,
      status: 'waiting',
    },
  };

  const response = await fetch(`${DATABASE_SERVICE_URL}/internal/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-auth': DB_SERVICE_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(
      `Failed to insert tournament match: ${response.status} ${errorText}`
    );
  }
}

// Public: insert all matches for a bracket
// bracket = { rounds: [...] }
// players = [{ alias, userId }, ...]
export async function insertTournamentMatches(tournamentId, bracket, players) {
  if (!bracket || !Array.isArray(bracket.rounds)) return;

  // Map alias -> userId (may be null)
  const aliasToUserId = new Map();
  players.forEach(p => {
    aliasToUserId.set(p.alias, p.userId ?? null);
  });

  const inserts = [];

  bracket.rounds.forEach((roundMatches, roundIndex) => {
    roundMatches.forEach((match, matchIndex) => {
      // 👇 These come straight from your generateBracket() output
      const player1Alias = match.player1 ?? null;
      const player2Alias = match.player2 ?? null;

      const player1Id =
        player1Alias != null ? aliasToUserId.get(player1Alias) ?? null : null;
      const player2Id =
        player2Alias != null ? aliasToUserId.get(player2Alias) ?? null : null;

      inserts.push(
        insertMatchRow({
          tournamentId,
          round: roundIndex + 1,
          matchNumber: matchIndex + 1,
          player1Alias,
          player2Alias,
          player1Id,
          player2Id,
        })
      );
    });
  });

  await Promise.all(inserts);
}


async function updateTournamentColumn(dbId, column, value) {
  const response = await fetch(`${DATABASE_SERVICE_URL}/internal/write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-auth': DB_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      table: 'Tournament',
      id: dbId,
      column,
      value,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to update tournament ${dbId} column ${column}: ${response.status} ${errorText}`);
  }
}

function buildMatchesSnapshot(bracket) {
  if (!bracket || !Array.isArray(bracket.rounds))
    return [];

  return bracket.rounds.flatMap((roundMatches, roundIndex) =>
    roundMatches.map((match, matchIndex) => ({
      matchId: match.matchId,
      round: roundIndex + 1,
      matchNumber: matchIndex + 1,
      player1: match.player1 ?? null,
      player2: match.player2 ?? null,
      status: match.status ?? 'waiting',
      winner: match.winner ?? null,
    }))
  );
}

function buildPlayersSnapshot(tournament) {
  const players = Array.from(tournament.playerSet || []);
  return players.map(name => ({
    name,
    userId: tournament.createdBy?.name === name ? tournament.createdBy?.id ?? null : null,
    role: tournament.createdBy?.name === name ? 'creator' : 'participant',
  }));
}


function toDbTimestamp(value) {
  if (!value) return null;

  const d = value instanceof Date ? value : new Date(value);

  const pad = n => String(n).padStart(2, '0');

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  // SQL style: "YYYY-MM-DD HH:MM:SS"
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


async function syncTournamentSnapshot(fastify, tournament) {
  if (!tournament?.dbId) return;

  const metadata = {
    serviceTournamentId: tournament.id,
    creator: tournament.createdBy ?? null,
    players: buildPlayersSnapshot(tournament),
    matches: buildMatchesSnapshot(tournament.bracket),
    status: tournament.status,
    createdAt: tournament.createdAt ?? null,
    // keep ISO in metadata if you like
    finishedAt: tournament.finishedAt
      ? new Date(tournament.finishedAt).toISOString()
      : null,
  };

  tournament.metadata = metadata;

  // keep an ISO version for in-memory usage
  const startedAtIso = tournament.startedAt
    ? new Date(tournament.startedAt).toISOString()
    : (tournament.status === 'progressing'
        ? new Date().toISOString()
        : null);

  if (startedAtIso && !tournament.startedAt) {
    tournament.startedAt = startedAtIso;
  }

  const finishedAtIso = tournament.finishedAt
    ? new Date(tournament.finishedAt).toISOString()
    : null;

  // DB-formatted values
  const startedAtDb = startedAtIso ? toDbTimestamp(startedAtIso) : null;
  const finishedAtDb = finishedAtIso ? toDbTimestamp(finishedAtIso) : null;

  const updates = [
    updateTournamentColumn(tournament.dbId, 'description', JSON.stringify(metadata)),
    updateTournamentColumn(tournament.dbId, 'current_players', tournament.playerSet?.size ?? 0),
    updateTournamentColumn(tournament.dbId, 'status', tournament.status ?? 'ready'),
    updateTournamentColumn(tournament.dbId, 'started_at', startedAtDb),
    updateTournamentColumn(tournament.dbId, 'finished_at', finishedAtDb),
  ];

  const results = await Promise.allSettled(updates);
  results.forEach((result, idx) => {
    if (result.status === 'rejected') {
      const column = ['description', 'current_players', 'status', 'started_at', 'finished_at'][idx];
      fastify.log.error({ err: result.reason, tournamentId: tournament.id, column }, '[TournamentService] Failed to update tournament column');
    }
  });
}



// async function syncTournamentSnapshot(fastify, tournament) {
//   if (!tournament?.dbId)
//     return;

//   const metadata = {
//     serviceTournamentId: tournament.id,
//     creator: tournament.createdBy ?? null,
//     players: buildPlayersSnapshot(tournament),
//     matches: buildMatchesSnapshot(tournament.bracket),
//     status: tournament.status,
//     createdAt: tournament.createdAt ?? null,
//     finishedAt: tournament.finishedAt ? new Date(tournament.finishedAt).toISOString() : null,
//   };

//   tournament.metadata = metadata;

//   const startedAt = tournament.startedAt ? new Date(tournament.startedAt).toISOString() : (tournament.status === 'progressing' ? new Date().toISOString() : null);
//   if (startedAt && !tournament.startedAt)
//     tournament.startedAt = startedAt;

//   const updates = [
//     updateTournamentColumn(tournament.dbId, 'description', JSON.stringify(metadata)),
//     updateTournamentColumn(tournament.dbId, 'current_players', tournament.playerSet?.size ?? 0),
//     updateTournamentColumn(tournament.dbId, 'status', tournament.status ?? 'ready'),
//     updateTournamentColumn(tournament.dbId, 'started_at', tournament.startedAt ?? startedAt ?? null),
//     updateTournamentColumn(tournament.dbId, 'finished_at', tournament.finishedAt ? new Date(tournament.finishedAt).toISOString() : null),
//   ];

//   const results = await Promise.allSettled(updates);
//   results.forEach((result, idx) => {
//     if (result.status === 'rejected') {
//       const column = ['description', 'current_players', 'status', 'started_at', 'finished_at'][idx];
//       fastify.log.error({ err: result.reason, tournamentId: tournament.id, column }, '[TournamentService] Failed to update tournament column');
//     }
//   });
// }

export function registercreateTournamentService(fastify, tournaments, getNextTournamentId) {
  fastify.post('/tournaments', async (request, reply) => {
    const { creator, creatorId = null, size, name } = request.body ?? {};

    const creatorName = typeof creator === 'string' ? creator.trim() : '';
    if (!creatorName)
      return reply.code(400).send({ error: 'Missing creator' });

    if (size !== 4 && size !== 8)
      return reply.code(400).send({ error: 'Invalid size (must be 4 or 8)' });

    const serviceTournamentId = getNextTournamentId();
    const tournamentName = typeof name === 'string' && name.trim().length > 0
      ? name.trim()
      : `${creatorName}'s Tournament`;

    try {
      const { dbId, metadata } = await persistTournamentRecord({
        serviceTournamentId,
        name: tournamentName,
        creatorName,
        creatorId,
        size,
      });

      const playerSet = new Set([creatorName]);
      const tournament = {
        id: serviceTournamentId,
        dbId,
        name: tournamentName,
        playerSet,
        size,
        status: 'ready',
        bracket: null,
        clients: new Set(),
        createdBy: {
          name: creatorName,
          id: creatorId,
        },
        createdAt: new Date().toISOString(),
        metadata,
        async syncSnapshot() {
          await syncTournamentSnapshot(fastify, this);
        },
      };

  tournaments.set(serviceTournamentId, tournament);
  reply.send({ id: serviceTournamentId, dbId });
    } catch (err) {
      fastify.log.error({ err }, '[TournamentService] Failed to create tournament');
      reply.code(500).send({ error: 'Failed to create tournament' });
    }
  });

  fastify.post('/tournaments/:id/join', async (request, reply) => {
    const t = tournaments.get(Number(request.params.id));
    const { player } = request.body;
    if (!t) return reply.code(404).send({ error: 'Tournament not found' });
    if (t.playerSet.has(player)) return reply.code(400).send({ error: 'Already joined' });
    if (t.playerSet.size >= t.size) return reply.code(400).send({ error: 'Tournament full' });

    t.playerSet.add(player);
    if (t.playerSet.size === t.size) {
      t.bracket = generateBracket(Array.from(t.playerSet));
      t.status = 'progressing';
    }
    try {
      if (typeof t.syncSnapshot === 'function') {
        await t.syncSnapshot();
      } else {
        await syncTournamentSnapshot(fastify, t);
      }
    } catch (err) {
      fastify.log.error({ err }, `[TournamentService] Failed to sync tournament ${t.id} snapshot after join`);
    }
    reply.send({ ok: true, status: t.status, bracket: t.bracket });
  });
}
