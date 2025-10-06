import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

import fetch from 'node-fetch'; // or axios
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:3002';

import { generateBracket, advanceWinner } from './tournamentLogic.js';
import websocket from '@fastify/websocket';
import { readFileSync } from 'fs';
import path from 'path';

await fastify.register(websocket);

// Tournament storage
const tournaments = new Map(); // tournamentId -> tournament data
let nextTournamentId = 1;

// Health check endpoint    
fastify.get('/health', async (request, reply) => {
  return { service: 'tournament-service', status: 'healthy', timestamp: new Date() };
});

// Create a new tournament
fastify.post('/tournaments', async (request, reply) => {
  const { players, name } = request.body;
  
  if (!players || !Array.isArray(players) || players.length < 2) {
    return reply.code(400).send({ error: 'At least 2 players required' });
  }
  
  const tournamentId = nextTournamentId++;
  const bracket = generateBracket(players);
  
  const tournament = {
    id: tournamentId,
    name: name || `Tournament ${tournamentId}`,
    players,
    bracket,
    currentMatch: findNextMatch(bracket),
    status: 'created', // 'created', 'active', 'finished'
    createdAt: new Date(),
    games: new Map() // matchKey -> gameId
  };
  
  tournaments.set(tournamentId, tournament);
  
  reply.code(201).send({
    id: tournamentId,
    name: tournament.name,
    players,
    bracket,
    currentMatch: tournament.currentMatch,
    status: 'created'
  });
});

// Get tournament details
fastify.get('/tournaments/:tournamentId', async (request, reply) => {
  const tournamentId = parseInt(request.params.tournamentId, 10);
  const tournament = tournaments.get(tournamentId);
  
  if (!tournament) {
    return reply.code(404).send({ error: 'Tournament not found' });
  }
  
  reply.send(tournament);
});

// List all tournaments
fastify.get('/tournaments', async (request, reply) => {
  const tournamentList = Array.from(tournaments.values()).map(t => ({
    id: t.id,
    name: t.name,
    players: t.players,
    status: t.status,
    createdAt: t.createdAt,
    currentMatch: t.currentMatch,
    winner: t.bracket.winner
  }));
  
  reply.send(tournamentList);
});

// Start a match in a tournament (creates a game in game-service)
fastify.post('/tournaments/:tournamentId/start-match', async (request, reply) => {
  const tournamentId = parseInt(request.params.tournamentId, 10);
  const tournament = tournaments.get(tournamentId);
  
  if (!tournament) {
    return reply.code(404).send({ error: 'Tournament not found' });
  }
  
  if (!tournament.currentMatch) {
    return reply.code(400).send({ error: 'No current match to start' });
  }
  
  const match = tournament.currentMatch.match;
  
  try {
    // Create a game in the game service
    const response = await fetch(`${GAME_SERVER_URL}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_id: match.player1,
        player2_id: match.player2
      })
    });
    
    if (!response.ok) {
      throw new Error(`Game service responded with ${response.status}`);
    }
    
    const gameData = await response.json();
    
    // Store the game ID in the tournament
    const matchKey = `${tournament.currentMatch.roundIdx}-${tournament.currentMatch.matchIdx}`;
    tournament.games.set(matchKey, gameData.id);
    tournament.status = 'active';
    
    reply.send({
      tournamentId,
      gameId: gameData.id,
      match: tournament.currentMatch,
      gameUrl: `ws://localhost:3002/ws/pong/game-ws/${gameData.id}`,
      message: 'Match started successfully'
    });
  } catch (error) {
    fastify.log.error('Failed to create game:', error);
    reply.code(500).send({ error: 'Failed to start match' });
  }
});

// Advance tournament with match result
fastify.post('/tournaments/:tournamentId/advance', async (request, reply) => {
  const tournamentId = parseInt(request.params.tournamentId, 10);
  const { winnerId } = request.body;
  const tournament = tournaments.get(tournamentId);
  
  if (!tournament) {
    return reply.code(404).send({ error: 'Tournament not found' });
  }
  
  if (!tournament.currentMatch) {
    return reply.code(400).send({ error: 'No current match to advance' });
  }
  
  const { roundIdx, matchIdx } = tournament.currentMatch;
  
  // Advance the bracket
  tournament.bracket = advanceWinner(tournament.bracket, roundIdx, matchIdx, winnerId);
  
  // Find next match
  tournament.currentMatch = findNextMatch(tournament.bracket);
  
  // Update tournament status
  if (tournament.bracket.status === 'finished') {
    tournament.status = 'finished';
  }
  
  reply.send({
    tournamentId,
    bracket: tournament.bracket,
    currentMatch: tournament.currentMatch,
    status: tournament.status,
    message: tournament.status === 'finished' ? 
      `Tournament complete! Winner: ${tournament.bracket.winner}` : 
      'Advanced to next match'
  });
});

// Reset/Delete tournament
fastify.delete('/tournaments/:tournamentId', async (request, reply) => {
  const tournamentId = parseInt(request.params.tournamentId, 10);
  
  if (tournaments.delete(tournamentId)) {
    reply.send({ message: 'Tournament deleted successfully' });
  } else {
    reply.code(404).send({ error: 'Tournament not found' });
  }
});

// Serve tournament test HTML
fastify.get('/test', async (request, reply) => {
  try {
    const htmlPath = path.join(process.cwd(), 'src', 'tournament.html');
    const content = readFileSync(htmlPath, 'utf8');
    reply.type('text/html').send(content);
  } catch (error) {
    reply.code(404).send({ error: 'Tournament test file not found' });
  }
});

// Helper function to find next unplayed match
function findNextMatch(bracket) {
  if (!bracket) return null;
  
  for (let roundIdx = 0; roundIdx < bracket.rounds.length; roundIdx++) {
    const round = bracket.rounds[roundIdx];
    for (let matchIdx = 0; matchIdx < round.length; matchIdx++) {
      const match = round[matchIdx];
      if (match.player1 && match.player2 && !match.winner) {
        return { roundIdx, matchIdx, match };
      }
    }
  }
  return null;
}

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3005, host: '0.0.0.0' });
    console.log('tournament-service running on port 3005');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
