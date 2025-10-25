// transcendence/services/game-service/src/room/RoomManager.js

import { GameRoom } from './GameRoom.js';
import logger from '../utils/logger.js';


export class RoomManager {
	constructor() {
		this.rooms = new Map(); 
		this.playerToRoom = new Map(); 

		this.startCleanupInterval();

		logger.info('[RoomManager] Initialized');
	}


	createRoom() {
		const roomId = this.generateRoomId();
		const room = new GameRoom(roomId);

		this.rooms.set(roomId, room);

		logger.info(`[RoomManager] Created room ${roomId}`);

		return roomId;
	}

	joinRoom(roomId, playerId, socket, playerInfo = {}) {
		let room = this.rooms.get(roomId);

		if (!room) {
			room = new GameRoom(roomId);
			this.rooms.set(roomId, room);
			logger.info(`[RoomManager] Auto-created room ${roomId}`);
		}

		if (room.isFull()) {
			logger.warn(`[RoomManager] Room ${roomId} is full`);
			return null;
		}

		const existingRoomId = this.playerToRoom.get(playerId);
		if (existingRoomId) {
			this.leaveRoom(existingRoomId, playerId);
		}

		const success = room.addPlayer(playerId, socket, playerInfo);

		if (!success) {
			return null;
		}

		this.playerToRoom.set(playerId, roomId);

		return room;
	}

	leaveRoom(roomId, playerId) {
		const room = this.rooms.get(roomId);

		if (!room) {
			return;
		}

		room.removePlayer(playerId);

		this.playerToRoom.delete(playerId);

		if (room.isEmpty()) {
			this.deleteRoom(roomId);
		}
	}

	deleteRoom(roomId) {
		const room = this.rooms.get(roomId);

		if (!room) {
			return;
		}

		room.stopGame();

		this.rooms.delete(roomId);

		logger.info(`[RoomManager] Deleted room ${roomId}`);
	}


	getRoom(roomId) {
		return this.rooms.get(roomId) || null;
	}

	getRoomByPlayer(playerId) {
		const roomId = this.playerToRoom.get(playerId);
		return roomId ? this.rooms.get(roomId) : null;
	}

	findAvailableRoom() {
		for (const [roomId, room] of this.rooms.entries()) {
			if (!room.isFull() && !room.isPlaying) {
				return roomId;
			}
		}
		return null;
	}

	generateRoomId() {
		const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let roomId;

		do {
			roomId = '';
			for (let i = 0; i < 6; i++) {
				roomId += characters.charAt(Math.floor(Math.random() * characters.length));
			}
		} while (this.rooms.has(roomId));

		return roomId;
	}

	cleanupInactiveRooms() {
		const now = Date.now();
		const inactivityTimeout = 30 * 60 * 1000; // 30 minutos

		const roomsToDelete = [];

		this.rooms.forEach((room, roomId) => {
			if (room.isEmpty() || (now - room.lastActivity > inactivityTimeout)) {
				roomsToDelete.push(roomId);
			}
		});

		roomsToDelete.forEach(roomId => {
			logger.info(`[RoomManager] Cleaning up inactive room ${roomId}`);
			this.deleteRoom(roomId);
		});

		if (roomsToDelete.length > 0) {
			logger.info(`[RoomManager] Cleaned up ${roomsToDelete.length} inactive rooms`);
		}
	}


	startCleanupInterval() {
		setInterval(() => {
			this.cleanupInactiveRooms();
		}, 5 * 60 * 1000);
	}

	getStats() {
		return {
			totalRooms: this.rooms.size,
			activeGames: Array.from(this.rooms.values()).filter(r => r.isPlaying).length,
			totalPlayers: this.playerToRoom.size,
			roomsList: Array.from(this.rooms.values()).map(r => r.getInfo())
		};
	}
}

export const roomManager = new RoomManager();