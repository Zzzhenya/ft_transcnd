// transcendence/services/game-service/src/websocket/remoteWebSocket.js

import { roomManager } from '../room/RoomManager.js';
import logger from '../utils/logger.js';

/**
 * Configura WebSocket para juego remoto
 * Endpoint: /ws/remote?roomId=ABC123&playerId=user123&username=Player1
 */
export function setupRemoteWebSocket(fastify) {
	fastify.get('/ws/remote', { websocket: true }, (connection, req) => {
		const { socket } = connection;

		// Extraer parámetros de la URL
		const url = new URL(req.url, `http://${req.headers.host}`);
		const roomId = url.searchParams.get('roomId');
		const playerId = url.searchParams.get('playerId');
		const username = url.searchParams.get('username') || 'Anonymous';

		logger.info(`[RemoteWS] Connection attempt - Room: ${roomId}, Player: ${playerId}`);

		// ========================================
		// VALIDACIONES
		// ========================================

		if (!roomId) {
			socket.send(JSON.stringify({
				type: 'error',
				message: 'Room ID is required'
			}));
			socket.close();
			return;
		}

		if (!playerId) {
			socket.send(JSON.stringify({
				type: 'error',
				message: 'Player ID is required'
			}));
			socket.close();
			return;
		}

		// ========================================
		// UNIR JUGADOR A LA ROOM
		// ========================================

		// Pass userId in playerInfo for database persistence
		// playerId format is "userId_timestamp_random", extract the userId part
		const userIdMatch = playerId.match(/^(\d+)_/);
		const userId = userIdMatch ? parseInt(userIdMatch[1]) : null;
		
		logger.debug(`[RemoteWS] Extracted userId: ${userId} from playerId: ${playerId}`);
		
		const room = roomManager.joinRoom(roomId, playerId, socket, { 
			username,
			userId: userId
		});

		if (!room) {
			socket.send(JSON.stringify({
				type: 'error',
				message: 'Unable to join room. Room may be full or invalid.'
			}));
			socket.close();
			return;
		}

		const playerNumber = room.getPlayerNumber(playerId);

		logger.info(`[RemoteWS] Player ${playerId} joined room ${roomId} as P${playerNumber}`);

		// ========================================
		// ENVIAR MENSAJE DE INICIALIZACIÓN
		// ========================================

		socket.send(JSON.stringify({
			type: 'init',
			roomId,
			playerId,
			playerNumber,
			roomInfo: room.getInfo()
		}));
		// Optional: explicitly inform others about this join to speed up UI, if GameRoom didn't already
		try {
			room.broadcast({
				type: 'playerJoined',
				playerId,
				playerNumber,
				playerInfo: { username },
				totalPlayers: room.players?.size ?? 0
			}, playerId);
		} catch {}

		// ========================================
		// EVENT LISTENERS
		// ========================================

		// Recibir mensajes del cliente
		socket.on('message', (data) => {
			try {
				const message = JSON.parse(data.toString());
				handleClientMessage(room, playerId, message);
			} catch (error) {
				logger.error(`[RemoteWS] Error parsing message from ${playerId}:`, error);
			}
		});

		// Manejar desconexión
		socket.on('close', () => {
			logger.info(`[RemoteWS] Player ${playerId} disconnected from room ${roomId}`);
			roomManager.leaveRoom(roomId, playerId);
		});

		// Manejar errores
		socket.on('error', (error) => {
			logger.error(`[RemoteWS] Socket error for player ${playerId}:`, error);
		});
	});
}

/**
 * Maneja mensajes entrantes del cliente
 */
function handleClientMessage(room, playerId, message) {
	const { type } = message;
	logger.debug(`[RemoteWS] msg ${type} from ${playerId}`);

	switch (type) {
		case 'paddleMove': {
			const { direction } = message;
			// Reduce noise; validate direction and forward
			if (['up', 'down', 'stop'].includes(direction)) {
				try { room.updatePaddle(playerId, direction); } catch {}
			} else {
				logger.warn(`[RemoteWS] Invalid paddle direction: ${direction}`);
			}
			break;
		}

		case 'ready':
			logger.info(`[RemoteWS] Player ${playerId} ready`);
			try { room.setPlayerReady(playerId); } catch {}
			break;

		case 'ping':
			// Reply with 'ts' to match frontend expectation
			try {
				room.sendToPlayer(playerId, {
					type: 'pong',
					ts: message.ts ?? message.timestamp ?? Date.now()
				});
			} catch {}
			break;

		case 'leave':
			logger.info(`[RemoteWS] Player ${playerId} leave request`);
			try { roomManager.leaveRoom(room.roomId, playerId); } catch {}
			break;

		default:
			logger.warn(`[RemoteWS] Unknown message type: ${type} from ${playerId}`);
	}
}