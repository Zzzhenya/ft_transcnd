// Remote Match Database Helper
// Handles all database operations for remote matches

import logger from './logger.js';

const DB_SERVICE_URL = process.env.DB_SERVICE_URL || 'http://database-service:3006';
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';

/**
 * Create a new remote match in the database using /internal/users endpoint
 * @param {number} player1Id - User ID of player 1
 * @param {number} player2Id - User ID of player 2
 * @returns {Promise<number|null>} - Match ID or null if failed
 */
export async function createRemoteMatch(player1Id, player2Id) {
  try {
    logger.info(`[RemoteMatchDB] Creating match: P1=${player1Id}, P2=${player2Id}`);

    const writePayload = {
      table: 'Remote_Match',
      action: 'insert',
      values: {
        player1_id: player1Id,
        player2_id: player2Id,
        Remote_status: 'waiting',
        player1_score: 0,
        player2_score: 0,
        created_at: new Date().toISOString()
      }
    };

    const response = await fetch(`${DB_SERVICE_URL}/internal/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(writePayload)
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[RemoteMatchDB] Failed to create match: ${response.status} - ${error}`);
      return null;
    }

    const result = await response.json();
    logger.info(`[RemoteMatchDB] ✅ Match created: ID=${result.id}`);
    return result.id;

  } catch (error) {
    logger.error(`[RemoteMatchDB] Error creating match:`, error);
    return null;
  }
}

/**
 * Start a remote match (set to in_progress) using /internal/write endpoint
 * @param {number} matchId - Match ID
 * @returns {Promise<boolean>} - Success status
 */
export async function startRemoteMatch(matchId) {
  if (!matchId) return false;

  try {
    logger.info(`[RemoteMatchDB] Starting match: ID=${matchId}`);

    // Update Remote_status to 'in_progress' and set started_at
    const writePayload = {
      table: 'Remote_Match',
      id: matchId,
      column: 'Remote_status',
      value: 'in_progress'
    };

    const response = await fetch(`${DB_SERVICE_URL}/internal/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(writePayload)
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[RemoteMatchDB] Failed to start match: ${response.status} - ${error}`);
      return false;
    }

    // Also update started_at timestamp
    const timestampPayload = {
      table: 'Remote_Match',
      id: matchId,
      column: 'started_at',
      value: new Date().toISOString()
    };

    await fetch(`${DB_SERVICE_URL}/internal/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      },
      body: JSON.stringify(timestampPayload)
    });

    logger.info(`[RemoteMatchDB] ✅ Match started: ID=${matchId}`);
    return true;

  } catch (error) {
    logger.error(`[RemoteMatchDB] Error starting match:`, error);
    return false;
  }
}

/**
 * Finish a remote match (set winner and scores) using /internal/write endpoint
 * @param {number} matchId - Match ID
 * @param {number} winnerId - User ID of winner
 * @param {number} player1Score - Score of player 1
 * @param {number} player2Score - Score of player 2
 * @returns {Promise<boolean>} - Success status
 */
export async function finishRemoteMatch(matchId, winnerId, player1Score, player2Score) {
  if (!matchId) return false;

  try {
    logger.info(`[RemoteMatchDB] Finishing match: ID=${matchId}, Winner=${winnerId}, Score=${player1Score}-${player2Score}`);

    const headers = {
      'Content-Type': 'application/json',
      'x-service-auth': DB_SERVICE_TOKEN
    };

    // Update all fields using multiple write calls
    const updates = [
      { column: 'winner_id', value: winnerId },
      { column: 'player1_score', value: player1Score },
      { column: 'player2_score', value: player2Score },
      { column: 'Remote_status', value: 'finished' },
      { column: 'finished_at', value: new Date().toISOString() }
    ];

    for (const update of updates) {
      const payload = {
        table: 'Remote_Match',
        id: matchId,
        column: update.column,
        value: update.value
      };

      const response = await fetch(`${DB_SERVICE_URL}/internal/write`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error(`[RemoteMatchDB] Failed to update ${update.column}: ${response.status} - ${error}`);
      }
    }

    logger.info(`[RemoteMatchDB] ✅ Match finished: ID=${matchId}`);
    return true;

  } catch (error) {
    logger.error(`[RemoteMatchDB] Error finishing match:`, error);
    return false;
  }
}

/**
 * Cancel a remote match
 * @param {number} matchId - Match ID
 * @returns {Promise<boolean>} - Success status
 */
export async function cancelRemoteMatch(matchId) {
  if (!matchId) return false;

  try {
    logger.info(`[RemoteMatchDB] Canceling match: ID=${matchId}`);

    const response = await fetch(`${DB_SERVICE_URL}/internal/remote-matches/${matchId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-auth': DB_SERVICE_TOKEN
      }
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`[RemoteMatchDB] Failed to cancel match: ${response.status} - ${error}`);
      return false;
    }

    logger.info(`[RemoteMatchDB] ✅ Match canceled: ID=${matchId}`);
    return true;

  } catch (error) {
    logger.error(`[RemoteMatchDB] Error canceling match:`, error);
    return false;
  }
}
