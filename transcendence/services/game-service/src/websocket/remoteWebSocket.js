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
		
		logger.info(`[RemoteWS] Extracted userId: ${userId} from playerId: ${playerId}`);
		
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

		logger.info(`[RemoteWS] ✅ Player ${playerId} joined room ${roomId} as P${playerNumber}`);

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
	logger.info(`[RemoteWS] 📨 Message from ${playerId}: ${type}`, message);

	switch (type) {
		case 'paddleMove':
			const { direction } = message;
			logger.info(`[RemoteWS] 🎮 Paddle move: player=${playerId}, direction=${direction}`);

			if (['up', 'down', 'stop'].includes(direction)) {
				room.updatePaddle(playerId, direction);
			} else {
				logger.warn(`[RemoteWS] Invalid paddle direction: ${direction}`);
			}
			break;

		case 'ready':
			// Cliente marca que está listo para jugar
			logger.info(`[RemoteWS] Player ${playerId} marked as ready`);
			room.setPlayerReady(playerId);
			break;

		case 'ping':
			// Responder con pong para calcular latencia
			room.sendToPlayer(playerId, {
				type: 'pong',
				timestamp: message.timestamp,
				serverTime: Date.now()
			});
			break;

		case 'leave':
			// Cliente quiere salir
			logger.info(`[RemoteWS] Player ${playerId} requested to leave`);
			roomManager.leaveRoom(room.roomId, playerId);
			break;

		default:
			logger.warn(`[RemoteWS] Unknown message type: ${type} from ${playerId}`);
	}
}