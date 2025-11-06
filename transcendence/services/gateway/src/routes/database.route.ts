import type { FastifyPluginAsync } from "fastify";
import logger from '../utils/logger.js';

const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://database-service:3006';
const DB_SERVICE_TOKEN = process.env.DB_SERVICE_TOKEN || 'super_secret_internal_token';

const databaseRoutes: FastifyPluginAsync = async (fastify) => {
    
    // Generische Write-Route
    fastify.post('/write', async (request, reply) => {
        // Auth-Check
        const token = request.headers.authorization;
        if (!token) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        
        // Verify user from JWT (pseudo-code - use your actual auth middleware)
        // const user = await verifyToken(token);
        
        const { table, id, column, value } = request.body as any;
        
        // Sicherheitsvalidierung
        const allowedTables = ['Users', 'Matches', 'Tournament_Singlematches'];
        if (!allowedTables.includes(table)) {
            return reply.code(403).send({ error: 'Table not allowed' });
        }
        
        // Optional: Check if user has permission to modify this record
        // ...
        
        try {
            const response = await fetch(`${DATABASE_SERVICE_URL}/internal/write`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-service-auth': DB_SERVICE_TOKEN
                },
                body: JSON.stringify({
                    table,
                    id,
                    column,
                    value
                })
            });
            
            if (!response.ok) {
                throw new Error('Database write failed');
            }
            
            const data = await response.json();
            return { success: true, ...data };
        } catch (error) {
            logger.error('Database write error:', error);
            return reply.code(500).send({ 
                error: 'Database operation failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    
    // Generische Read-Route
    fastify.get('/read', async (request, reply) => {
        const token = request.headers.authorization;
        if (!token) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        
        const { table, id, columns = '*' } = request.query as any;
        
        // Sicherheitsvalidierung
        const allowedTables = ['Users', 'Matches', 'Tournament_Singlematches'];
        if (!allowedTables.includes(table)) {
            return reply.code(403).send({ error: 'Table not allowed' });
        }
        
        try {
            const response = await fetch(`${DATABASE_SERVICE_URL}/internal/read?table=${table}&id=${id}&columns=${columns}`, {
                method: 'GET',
                headers: {
                    'x-service-auth': DB_SERVICE_TOKEN
                }
            });
            
            if (!response.ok) {
                throw new Error('Database read failed');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('Database read error:', error);
            return reply.code(500).send({ 
                error: 'Database operation failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
    
    // Generische Query-Route für komplexere Abfragen
    fastify.post('/query', async (request, reply) => {
        const token = request.headers.authorization;
        if (!token) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
        
        const { table, columns, filters, limit } = request.body as any;
        
        // Sicherheitsvalidierung
        const allowedTables = ['Users', 'Matches', 'Tournament_Singlematches'];
        if (!allowedTables.includes(table)) {
            return reply.code(403).send({ error: 'Table not allowed' });
        }
        
        try {
            const response = await fetch(`${DATABASE_SERVICE_URL}/internal/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-service-auth': DB_SERVICE_TOKEN
                },
                body: JSON.stringify({
                    table,
                    columns,
                    filters,
                    limit
                })
            });
            
            if (!response.ok) {
                throw new Error('Database query failed');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            logger.error('Database query error:', error);
            return reply.code(500).send({ 
                error: 'Database operation failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};

export default databaseRoutes;