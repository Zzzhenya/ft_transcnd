/**
 * Create a new game
 */
import { startGameLoop, initialGameState } from '../pong/gameLogic.js';

// Shared game storage and counters
const games = new Map();
let nextGameId = 1;
let nextPlayerId = 1;

// Counters object for routes
const counters = {
  get nextGameId() { return nextGameId; },
  set nextGameId(value) { nextGameId = value; },
  get nextPlayerId() { return nextPlayerId; },
  set nextPlayerId(value) { nextPlayerId = value; }
};

export { games, counters };