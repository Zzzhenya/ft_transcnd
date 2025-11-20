// Remote Match endpoints for database-service
// These endpoints handle CRUD operations for the Remote_Match table

export function registerRemoteMatchRoutes(fastify, { db, dbRun, dbGet, addToQueue, writeQueue, allowedTables }) {
  
  // Create a new remote match (waiting status)
  fastify.post('/internal/remote-matches/create', async (request, reply) => {
    const { player1_id, player2_id } = request.body;

    if (!player1_id || !player2_id) {
      return reply.code(400).send({ error: 'player1_id and player2_id are required' });
    }

    if (!allowedTables['Remote_Match']) {
      return reply.code(400).send({ error: 'Remote_Match table not found in schema' });
    }

    const sql = `
      INSERT INTO Remote_Match (player1_id, player2_id, Remote_status, created_at)
      VALUES (?, ?, 'waiting', CURRENT_TIMESTAMP)
    `;

    try {
      const result = await addToQueue(() =>
        db.transaction(() => dbRun(sql, [player1_id, player2_id]))()
      );

      const match = dbGet('SELECT * FROM Remote_Match WHERE id = ?', [result.lastInsertRowid]);

      fastify.log.info(`Remote match created: ${result.lastInsertRowid} (${player1_id} vs ${player2_id})`);

      return {
        success: true,
        message: 'Remote match created',
        id: result.lastInsertRowid,
        match: match
      };
    } catch (err) {
      fastify.log.error('Failed to create remote match:', err);

      if (err.name === 'TimeoutError') {
        return reply.code(504).send({
          error: 'Database operation timed out',
          queueStatus: { size: writeQueue.size, pending: writeQueue.pending }
        });
      }

      if (err.message.includes('Queue full')) {
        return reply.code(503).send({
          error: 'Service temporarily unavailable',
          details: err.message
        });
      }

      return reply.code(500).send({ error: 'Failed to create remote match', details: err.message });
    }
  });

  // Start a remote match (set to in_progress)
  fastify.post('/internal/remote-matches/:id/start', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.code(400).send({ error: 'Match id is required' });
    }

    const sql = `
      UPDATE Remote_Match
      SET Remote_status = 'in_progress', started_at = CURRENT_TIMESTAMP
      WHERE id = ? AND Remote_status = 'waiting'
    `;

    try {
      const result = await addToQueue(() =>
        db.transaction(() => dbRun(sql, [id]))()
      );

      if (result.changes === 0) {
        return reply.code(404).send({
          error: 'Match not found or already started',
          details: 'Match must be in waiting status to start'
        });
      }

      fastify.log.info(`Remote match started: ${id}`);

      return {
        success: true,
        message: 'Remote match started',
        changes: result.changes
      };
    } catch (err) {
      fastify.log.error('Failed to start remote match:', err);

      if (err.name === 'TimeoutError') {
        return reply.code(504).send({
          error: 'Database operation timed out',
          queueStatus: { size: writeQueue.size, pending: writeQueue.pending }
        });
      }

      return reply.code(500).send({ error: 'Failed to start remote match', details: err.message });
    }
  });

  // Finish a remote match (set winner, scores, finished status)
  fastify.post('/internal/remote-matches/:id/finish', async (request, reply) => {
    const { id } = request.params;
    const { winner_id, player1_score, player2_score } = request.body;

    if (!id) {
      return reply.code(400).send({ error: 'Match id is required' });
    }

    if (winner_id === undefined || player1_score === undefined || player2_score === undefined) {
      return reply.code(400).send({
        error: 'winner_id, player1_score, and player2_score are required'
      });
    }

    const sql = `
      UPDATE Remote_Match
      SET Remote_status = 'finished',
          winner_id = ?,
          player1_score = ?,
          player2_score = ?,
          finished_at = CURRENT_TIMESTAMP
      WHERE id = ? AND Remote_status IN ('in_progress', 'waiting')
    `;

    try {
      const result = await addToQueue(() =>
        db.transaction(() => dbRun(sql, [winner_id, player1_score, player2_score, id]))()
      );

      if (result.changes === 0) {
        return reply.code(404).send({
          error: 'Match not found or already finished',
          details: 'Match must be in waiting or in_progress status to finish'
        });
      }

      fastify.log.info(`Remote match finished: ${id} (winner: ${winner_id}, score: ${player1_score}-${player2_score})`);

      return {
        success: true,
        message: 'Remote match finished',
        changes: result.changes
      };
    } catch (err) {
      fastify.log.error('Failed to finish remote match:', err);

      if (err.name === 'TimeoutError') {
        return reply.code(504).send({
          error: 'Database operation timed out',
          queueStatus: { size: writeQueue.size, pending: writeQueue.pending }
        });
      }

      return reply.code(500).send({ error: 'Failed to finish remote match', details: err.message });
    }
  });

  // Cancel a remote match
  fastify.post('/internal/remote-matches/:id/cancel', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.code(400).send({ error: 'Match id is required' });
    }

    const sql = `
      UPDATE Remote_Match
      SET Remote_status = 'canceled'
      WHERE id = ? AND Remote_status IN ('waiting', 'in_progress')
    `;

    try {
      const result = await addToQueue(() =>
        db.transaction(() => dbRun(sql, [id]))()
      );

      if (result.changes === 0) {
        return reply.code(404).send({
          error: 'Match not found or already finished/canceled'
        });
      }

      fastify.log.info(`Remote match canceled: ${id}`);

      return {
        success: true,
        message: 'Remote match canceled',
        changes: result.changes
      };
    } catch (err) {
      fastify.log.error('Failed to cancel remote match:', err);

      if (err.name === 'TimeoutError') {
        return reply.code(504).send({
          error: 'Database operation timed out',
          queueStatus: { size: writeQueue.size, pending: writeQueue.pending }
        });
      }

      return reply.code(500).send({ error: 'Failed to cancel remote match', details: err.message });
    }
  });

  // Get a remote match by id
  fastify.get('/internal/remote-matches/:id', async (request, reply) => {
    const { id } = request.params;

    if (!id) {
      return reply.code(400).send({ error: 'Match id is required' });
    }

    try {
      const match = dbGet('SELECT * FROM Remote_Match WHERE id = ?', [id]);

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      return {
        success: true,
        match: match
      };
    } catch (err) {
      fastify.log.error('Failed to get remote match:', err);
      return reply.code(500).send({ error: 'Failed to get remote match', details: err.message });
    }
  });

  // Get active remote matches for a player pair
  fastify.get('/internal/remote-matches/active', async (request, reply) => {
    const { player1_id, player2_id } = request.query;

    if (!player1_id || !player2_id) {
      return reply.code(400).send({ error: 'player1_id and player2_id are required' });
    }

    try {
      const sql = `
        SELECT * FROM Remote_Match
        WHERE ((player1_id = ? AND player2_id = ?) OR (player1_id = ? AND player2_id = ?))
          AND Remote_status IN ('waiting', 'in_progress')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const match = dbGet(sql, [player1_id, player2_id, player2_id, player1_id]);

      return {
        success: true,
        match: match || null
      };
    } catch (err) {
      fastify.log.error('Failed to get active remote match:', err);
      return reply.code(500).send({ error: 'Failed to get active remote match', details: err.message });
    }
  });

  fastify.log.info('✅ Remote Match routes registered');
}
