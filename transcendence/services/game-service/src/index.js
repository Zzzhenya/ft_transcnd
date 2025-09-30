import Fastify from 'fastify';
const fastify = Fastify({ logger: true });
import sqlite3 from 'sqlite3';
import path from 'path';

// Connect to your SQLite database
// const db = new sqlite3.Database(
//   path.resolve(__dirname, '../../../shared/database/database.sqlite')
// );


import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new sqlite3.Database(
  path.resolve(__dirname, '../../../shared/database/database.sqlite')
);
// Health check endpoint
fastify.get('/health', async () => {
  return { service: 'ping-game-engine', status: 'healthy', timestamp: new Date() };
});

// Create a new ping pong game
fastify.post('/games', (request, reply) => {
  const { player1_id, player2_id } = request.body;
  // Initial game state: scores and positions
  const initialState = JSON.stringify({
    score: { player1: 0, player2: 0 },
    ball: { x: 0, y: 0, vx: 1, vy: 1 },
    paddles: { player1: 0, player2: 0 }
  });
  db.run(
    'INSERT INTO games (player1_id, player2_id, game_state, status) VALUES (?, ?, ?, ?)',
    [player1_id, player2_id, initialState, 'waiting'],
    function (err) {
      if (err) {
        reply.code(500).send({ error: err.message });
      } else {
        reply.code(201).send({ id: this.lastID });
      }
    }
  );
});

// Get game state
fastify.get('/games/:id/state', (request, reply) => {
  db.get('SELECT game_state FROM games WHERE id = ?', [request.params.id], (err, row) => {
    if (err) {
      reply.code(500).send({ error: err.message });
    } else if (!row) {
      reply.code(404).send({ error: 'Game not found' });
    } else {
      reply.send(JSON.parse(row.game_state));
    }
  });
});

// Update game state (score, ball, paddles)
fastify.put('/games/:id/state', (request, reply) => {
  const { game_state } = request.body; // Should be a JSON object
  db.run(
    'UPDATE games SET game_state = ? WHERE id = ?',
    [JSON.stringify(game_state), request.params.id],
    function (err) {
      if (err) {
        reply.code(500).send({ error: err.message });
      } else {
        reply.send({ updated: this.changes });
      }
    }
  );
});

// End game and set winner
fastify.put('/games/:id/end', (request, reply) => {
  const { winner_id, final_score } = request.body;
  db.run(
    'UPDATE games SET winner_id = ?, final_score = ?, status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
    [winner_id, JSON.stringify(final_score), 'finished', request.params.id],
    function (err) {
      if (err) {
        reply.code(500).send({ error: err.message });
      } else {
        reply.send({ ended: this.changes });
      }
    }
  );
});

// Move paddle endpoint
fastify.put('/games/:id/paddle', (request, reply) => {
  const { player, direction } = request.body; // player: 'player1' or 'player2', direction: -1 or 1
  db.get('SELECT game_state FROM games WHERE id = ?', [request.params.id], (err, row) => {
    if (err || !row) {
      reply.code(404).send({ error: 'Game not found' });
      return;
    }
    let gameState = JSON.parse(row.game_state);
    gameState = gameLogic.movePaddle(gameState, player, direction);
    db.run(
      'UPDATE games SET game_state = ? WHERE id = ?',
      [JSON.stringify(gameState), request.params.id],
      function (err) {
        if (err) {
          reply.code(500).send({ error: err.message });
        } else {
          reply.send({ updated: this.changes, game_state: gameState });
        }
      }
    );
  });
});

// Move ball endpoint
fastify.put('/games/:id/ball', (request, reply) => {
  db.get('SELECT game_state FROM games WHERE id = ?', [request.params.id], (err, row) => {
    if (err || !row) {
      reply.code(404).send({ error: 'Game not found' });
      return;
    }
    let gameState = JSON.parse(row.game_state);
    gameState = gameLogic.moveBall(gameState);
    db.run(
      'UPDATE games SET game_state = ? WHERE id = ?',
      [JSON.stringify(gameState), request.params.id],
      function (err) {
        if (err) {
          reply.code(500).send({ error: err.message });
        } else {
          reply.send({ updated: this.changes, game_state: gameState });
        }
      }
    );
  });
});


fastify.post('/tournaments', (request, reply) => {
  const { playerIds, name } = request.body;
  const bracket = tournamentLogic.generateBracket(playerIds);
  db.run(
    'INSERT INTO tournaments (name, bracket, status) VALUES (?, ?, ?)',
    [name, JSON.stringify(bracket), 'registration'],
    function (err) {
      if (err) {
        reply.code(500).send({ error: err.message });
      } else {
        reply.code(201).send({ id: this.lastID, bracket });
      }
    }
  );
});

// Advance winner endpoint
fastify.put('/tournaments/:id/advance', (request, reply) => {
  const { roundIdx, matchIdx, winnerId } = request.body;
  db.get('SELECT bracket FROM tournaments WHERE id = ?', [request.params.id], (err, row) => {
    if (err || !row) {
      reply.code(404).send({ error: 'Tournament not found' });
      return;
    }
    let bracket = JSON.parse(row.bracket);
    bracket = tournamentLogic.advanceWinner(bracket, roundIdx, matchIdx, winnerId);
    db.run(
      'UPDATE tournaments SET bracket = ? WHERE id = ?',
      [JSON.stringify(bracket), request.params.id],
      function (err) {
        if (err) {
          reply.code(500).send({ error: err.message });
        } else {
          reply.send({ updated: this.changes, bracket });
        }
      }
    );
  });
});

import { generateBracket, advanceWinner } from './tournamentLogic.js';

//Save bracket as JSON in your tournaments table

// Load bracket from DB, then:
//tournamentLogic.advanceWinner(bracket, roundIdx, matchIdx, winnerId);
// Save updated bracket back to DB

// Start the server
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  fastify.log.info(`Ping Pong Game Engine listening at ${address}`);
});