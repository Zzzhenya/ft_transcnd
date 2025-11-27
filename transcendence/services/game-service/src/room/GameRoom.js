// transcendence/services/game-service/src/room/GameRoom.js
// FIXED: Player disconnect handling + proper reconnection + heartbeat

import {
	initialRemoteGameState,
	moveRemoteBall,
	moveRemotePaddle,
	endRemoteRound,
	startRemoteNextRound,
	startRemoteGame,
	REMOTE_GAME_CONFIG
} from '../pong/remoteGameLogic.js';
import logger from '../utils/logger.js';
import { createRemoteMatch, startRemoteMatch, finishRemoteMatch } from '../utils/remoteMatchDB.js';

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const DISCONNECT_GRACE_PERIOD = 15000; // 15 seconds to reconnect

export class GameRoom {
	constructor(roomId, options = {}) {
		this.roomId = roomId;
		this.players = new Map(); // playerId -> playerData
		this.playerSlots = new Map(); // userId -> slotData (for reconnection)
		this.maxPlayers = 2;
		this.gameState = null;
		this.gameLoopInterval = null;
		this.countdownInterval = null;
		this.isPlaying = false;
		this.isPaused = false;
		this.createdAt = Date.now();
		this.lastActivity = Date.now();
		this.matchId = null;
		this.matchStarted = false;
		this.gameType = options.gameType || 'remote';
		this.tournamentId = options.tournamentId || null;
		this.heartbeatIntervals = new Map(); // playerId -> intervalId
		this.disconnectTimeouts = new Map(); // playerId -> timeoutId

		logger.info(`[GameRoom] Room ${roomId} created (type: ${this.gameType})`);
	}

	createInitialGameState() {
		const state = initialRemoteGameState();
		logger.info(`[GameRoom] Created initial remote game state`);
		return state;
	}

	addPlayer(playerId, socket, playerInfo = {}) {
		const userId = playerInfo.userId;

		// Check if this is a reconnection
		if (userId && this.playerSlots.has(userId)) {
			return this.reconnectPlayer(playerId, socket, playerInfo);
		}

		// Check room capacity - if full and not a reconnection, reject immediately
		if (this.players.size >= this.maxPlayers && !this.players.has(playerId)) {
			logger.warn(`[GameRoom] ${this.roomId} is full - rejecting player ${playerId}`);
			
			// Send room full message and close connection
			try {
				socket.send(JSON.stringify({
					type: 'roomFull',
					message: 'This room is full. Please try another room.'
				}));
				setTimeout(() => {
					socket.close(1008, 'Room is full');
				}, 100);
			} catch (e) {
				logger.warn(`[GameRoom] Error sending room full message:`, e);
			}
			
			return false;
		}

		// Remove existing player with same playerId (stale connection)
		if (this.players.has(playerId)) {
			const existing = this.players.get(playerId);
			logger.warn(`[GameRoom] Player ${playerId} already exists, replacing connection`);

			try {
				if (existing.socket && (existing.socket.readyState === 0 || existing.socket.readyState === 1)) {
					existing.socket.close(1012, 'Replaced by new connection');
				}
			} catch (e) {
				logger.warn(`[GameRoom] Error closing previous socket:`, e);
			}

			// Cancel any pending disconnect timeout
			if (this.disconnectTimeouts.has(playerId)) {
				clearTimeout(this.disconnectTimeouts.get(playerId));
				this.disconnectTimeouts.delete(playerId);
			}
		}

		const playerNumber = this.players.size + 1;
		const playerData = {
			socket,
			playerNumber,
			ready: false,
			status: 'connected',
			userId: userId,
			info: {
				username: playerInfo.username || `Player ${playerNumber}`,
				avatar: playerInfo.avatar || null,
				userId: userId,
				...playerInfo
			},
			lastHeartbeat: Date.now()
		};

		this.players.set(playerId, playerData);

		// Track by userId for reconnection
		if (userId) {
			this.playerSlots.set(userId, {
				playerId,
				playerNumber,
				ready: false,
				status: 'connected'
			});
		}

		this.lastActivity = Date.now();

		logger.info(`[GameRoom] Player ${playerId} (userId: ${userId}, P${playerNumber}) joined`);

		// Start heartbeat monitoring
		this.startHeartbeat(playerId);

		// Broadcast to others
		this.broadcast({
			type: 'playerJoined',
			playerId,
			playerNumber,
			playerInfo: playerData.info,
			totalPlayers: this.players.size
		}, playerId);

		return true;
	}

	reconnectPlayer(playerId, socket, playerInfo) {
		const userId = playerInfo.userId;
		const slot = this.playerSlots.get(userId);

		if (!slot) {
			logger.warn(`[GameRoom] No slot found for userId ${userId}`);
			
			// If game is in progress and user not in slots, reject
			if (this.isPlaying) {
				try {
					socket.send(JSON.stringify({
						type: 'error',
						message: 'Cannot join game in progress'
					}));
					setTimeout(() => {
						socket.close(1008, 'Not a participant');
					}, 100);
				} catch (e) {
					logger.warn(`[GameRoom] Error sending rejection:`, e);
				}
			}
			
			return false;
		}

		logger.info(`[GameRoom] Player reconnecting: userId=${userId}, old playerId=${slot.playerId}, new playerId=${playerId}`);

		// Cancel any pending disconnect timeout for old playerId
		if (this.disconnectTimeouts.has(slot.playerId)) {
			clearTimeout(this.disconnectTimeouts.get(slot.playerId));
			this.disconnectTimeouts.delete(slot.playerId);
			logger.info(`[GameRoom] Cancelled disconnect timeout for ${slot.playerId}`);
		}

		// Stop heartbeat for old playerId
		this.stopHeartbeat(slot.playerId);

		// Remove old player entry if exists (but don't close socket yet)
		if (this.players.has(slot.playerId) && slot.playerId !== playerId) {
			const oldPlayer = this.players.get(slot.playerId);
			// Only close old socket if it's different from the new one
			if (oldPlayer.socket !== socket) {
				try {
					if (oldPlayer.socket && oldPlayer.socket.readyState <= 1) {
						oldPlayer.socket.close(1000, 'Reconnected with new connection');
					}
				} catch (e) {
					logger.warn(`[GameRoom] Error closing old socket:`, e);
				}
			}
			this.players.delete(slot.playerId);
		}

		// Create new player entry with same slot
		const playerData = {
			socket,
			playerNumber: slot.playerNumber,
			ready: slot.ready,
			status: 'connected',
			userId: userId,
			info: {
				username: playerInfo.username || slot.username || `Player ${slot.playerNumber}`,
				avatar: playerInfo.avatar || null,
				userId: userId,
				...playerInfo
			},
			lastHeartbeat: Date.now()
		};

		this.players.set(playerId, playerData);

		// Update slot with new playerId
		slot.playerId = playerId;
		slot.status = 'connected';
		this.playerSlots.set(userId, slot);

		this.lastActivity = Date.now();

		logger.info(`[GameRoom] Player ${playerId} reconnected as P${slot.playerNumber}`);

		// Start heartbeat for new connection
		this.startHeartbeat(playerId);

		// Send reconnection confirmation with game state if in progress
		if (this.isPlaying && this.gameState) {
			// Send game reconnection with current state
			this.sendToPlayer(playerId, {
				type: 'gameReconnection',
				playerId,
				playerNumber: slot.playerNumber,
				gameState: {
					score: this.gameState.score,
					ball: this.gameState.ball,
					paddles: this.gameState.paddles,
					tournament: this.gameState.tournament
				},
				message: 'Reconnected to game in progress'
			});
		} else {
			// Send normal reconnection for waiting room
			this.sendToPlayer(playerId, {
				type: 'playerReconnected',
				playerId,
				playerNumber: slot.playerNumber,
				message: 'Reconnected successfully'
			});
			
			// Send current room state to reconnected player
			this.sendToPlayer(playerId, {
				type: 'roomSnapshot',
				roomInfo: this.getInfo(),
				isPlaying: this.isPlaying
			});
		}

		// Don't broadcast playerJoined for reconnections - it's a silent reconnect
		logger.info(`[GameRoom] Player ${playerId} reconnected silently without broadcast`);

		return true;
	}

	removePlayer(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			return;
		}

		logger.info(`[GameRoom] Player ${playerId} disconnecting from room ${this.roomId}`);

		// Stop heartbeat
		this.stopHeartbeat(playerId);

		const userId = player.userId;

		// If game is playing, schedule graceful removal with timeout
		if (this.isPlaying && !this.isPaused) {
			logger.info(`[GameRoom] Game is active, setting ${DISCONNECT_GRACE_PERIOD}ms grace period for ${playerId}`);

			// Mark as disconnected but don't remove yet
			player.status = 'disconnected';

			if (userId) {
				const slot = this.playerSlots.get(userId);
				if (slot) {
					slot.status = 'disconnected';
					slot.disconnectedAt = Date.now();
				}
			}

			// Schedule removal after grace period
			const timeoutId = setTimeout(() => {
				logger.info(`[GameRoom] Grace period expired for ${playerId}, forcing disconnect`);
				this.forceRemovePlayer(playerId);
			}, DISCONNECT_GRACE_PERIOD);

			this.disconnectTimeouts.set(playerId, timeoutId);

		} else {
			// Not playing, remove immediately
			this.forceRemovePlayer(playerId);
		}

		this.lastActivity = Date.now();
	}

	forceRemovePlayer(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			return;
		}

		logger.info(`[GameRoom] Force removing player ${playerId}`);

		const userId = player.userId;

		// Remove from players
		this.players.delete(playerId);

		// Remove from slots
		if (userId) {
			this.playerSlots.delete(userId);
		}

		// Clear any timeouts
		if (this.disconnectTimeouts.has(playerId)) {
			clearTimeout(this.disconnectTimeouts.get(playerId));
			this.disconnectTimeouts.delete(playerId);
		}

		// Stop heartbeat
		this.stopHeartbeat(playerId);

		// If game is playing, end it
		if (this.isPlaying && !this.isPaused) {
			this.stopGame();

			// Notify remaining player
			this.broadcast({
				type: 'playerDisconnected',
				playerId,
				reason: 'left',
				message: 'Opponent disconnected. Returning to lobby...'
			});

			// Close room after 2 seconds
			setTimeout(() => {
				this.broadcast({
					type: 'forceReturnLobby',
					reason: 'opponent_left'
				});
			}, 2000);
		} else {
			// Just broadcast player left
			this.broadcast({
				type: 'playerLeft',
				playerId,
				totalPlayers: this.players.size
			});
		}
	}

	startHeartbeat(playerId) {
		// Clear existing interval if any
		this.stopHeartbeat(playerId);

		const intervalId = setInterval(() => {
			const player = this.players.get(playerId);
			if (!player) {
				this.stopHeartbeat(playerId);
				return;
			}

			const now = Date.now();
			const timeSinceLastHeartbeat = now - player.lastHeartbeat;

			// If no heartbeat for 2x interval, consider disconnected
			if (timeSinceLastHeartbeat > HEARTBEAT_INTERVAL * 2) {
				logger.warn(`[GameRoom] Player ${playerId} heartbeat timeout (${timeSinceLastHeartbeat}ms)`);
				this.removePlayer(playerId);
			} else {
				// Send ping
				try {
					if (player.socket && player.socket.readyState === 1) {
						player.socket.send(JSON.stringify({
							type: 'ping',
							timestamp: now
						}));
					}
				} catch (e) {
					logger.warn(`[GameRoom] Error sending heartbeat to ${playerId}:`, e);
				}
			}
		}, HEARTBEAT_INTERVAL);

		this.heartbeatIntervals.set(playerId, intervalId);
	}

	stopHeartbeat(playerId) {
		if (this.heartbeatIntervals.has(playerId)) {
			clearInterval(this.heartbeatIntervals.get(playerId));
			this.heartbeatIntervals.delete(playerId);
		}
	}

	updateHeartbeat(playerId) {
		const player = this.players.get(playerId);
		if (player) {
			player.lastHeartbeat = Date.now();
		}
	}

	setPlayerReady(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			logger.warn(`[GameRoom] Player ${playerId} not found`);
			return;
		}

		player.ready = true;

		// Update slot
		if (player.userId) {
			const slot = this.playerSlots.get(player.userId);
			if (slot) {
				slot.ready = true;
			}
		}

		this.lastActivity = Date.now();

		logger.info(`[GameRoom] Player ${playerId} is ready`);

		this.broadcast({
			type: 'playerReady',
			playerId,
			playerNumber: player.playerNumber
		});

		if (this.allPlayersReady()) {
			logger.info(`[GameRoom] ✅ All players ready! Starting countdown...`);
			this.startCountdown();
		}
	}

	async startCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		logger.info(`[GameRoom] 🕐 Starting countdown`);

		if (!this.gameState) {
			this.gameState = this.createInitialGameState();
		}
		this.gameState.tournament.gameStatus = 'roundCountdown';

		await this.createDatabaseMatch();

		// Send gameStart FIRST to initialize the scene
		this.broadcast({
			type: 'gameStart',
			gameState: {
				score: this.gameState.score,
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				tournament: this.gameState.tournament
			}
		});

		// Wait a bit for scene to start loading, then begin countdown
		setTimeout(() => {
			let count = 3;

			this.broadcast({
				type: 'countdown',
				count
			});

			this.countdownInterval = setInterval(() => {
				count--;

				if (count > 0) {
					this.broadcast({
						type: 'countdown',
						count
					});
				} else {
					this.broadcast({
						type: 'countdown',
						count: 0
					});
					clearInterval(this.countdownInterval);
					this.countdownInterval = null;

					setTimeout(() => this.startGame(), 300);
				}
			}, 1000);
		}, 500);
	}

	async createDatabaseMatch() {
		if (this.gameType !== 'remote') {
			return;
		}

		const playersArray = Array.from(this.players.values());

		if (playersArray.length !== 2) {
			return;
		}

		const player1UserId = playersArray[0].info.userId;
		const player2UserId = playersArray[1].info.userId;

		if (!player1UserId || !player2UserId) {
			return;
		}

		this.matchId = await createRemoteMatch(player1UserId, player2UserId);

		if (this.matchId) {
			logger.info(`[GameRoom] ✅ Match created: ID=${this.matchId}`);
		}
	}

	async startGame() {
		if (this.isPlaying) {
			return;
		}

		logger.info(`[GameRoom] 🚀 Starting game`);

		if (this.matchId) {
			await startRemoteMatch(this.matchId);
		}

		if (!this.gameState) {
			this.gameState = this.createInitialGameState();
		}

		startRemoteGame(this.gameState);

		this.isPlaying = true;
		this.isPaused = false;

		// Start at 60 FPS
		this.gameLoopInterval = setInterval(() => {
			this.tick();
		}, 1000 / 60);

		this.lastActivity = Date.now();
	}

	pauseGame() {
		if (!this.isPlaying || this.isPaused) {
			return;
		}

		this.isPaused = true;

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'paused';
		}

		this.broadcast({
			type: 'gamePaused'
		});
	}

	resumeGame() {
		if (!this.isPlaying || !this.isPaused) {
			return;
		}

		this.isPaused = false;

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'playing';
		}

		this.broadcast({
			type: 'gameResumed',
			gameState: {
				score: this.gameState.score,
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				tournament: this.gameState.tournament
			}
		});
	}

	stopGame() {
		if (this.gameLoopInterval) {
			clearInterval(this.gameLoopInterval);
			this.gameLoopInterval = null;
		}

		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		// Stop all heartbeats
		this.heartbeatIntervals.forEach((intervalId, playerId) => {
			clearInterval(intervalId);
		});
		this.heartbeatIntervals.clear();

		// Clear all disconnect timeouts
		this.disconnectTimeouts.forEach((timeoutId, playerId) => {
			clearTimeout(timeoutId);
		});
		this.disconnectTimeouts.clear();

		this.isPlaying = false;
		this.isPaused = false;

		logger.info(`[GameRoom] Game stopped`);
	}

	tick() {
		if (!this.gameState || !this.isPlaying || this.isPaused) {
			return;
		}

		if (this.gameState.tournament.gameStatus === 'roundCountdown') {
			this.broadcast({
				type: 'hud',
				currentRound: this.gameState.tournament.currentRound,
				roundsWon: this.gameState.tournament.roundsWon,
				score: this.gameState.score,
				scoreLimit: this.gameState.tournament.scoreLimit,
				status: this.gameState.tournament.gameStatus
			});
			return;
		}

		if (this.gameState.tournament.gameStatus === 'playing') {
			moveRemoteBall(this.gameState);

			if (this.gameState.tournament.gameStatus === 'gameEnd') {
				logger.info(`[GameRoom] GAME END detected! Winner: ${this.gameState.tournament.winner}`);
				const winnerNum = this.gameState.tournament.winner === 'player1' ? 1 : 2;
				this.endGame(winnerNum);
				return;
			}

			if (this.gameState.tournament.gameStatus === 'roundEnd') {
				logger.info(`[GameRoom] Round ended. Starting next round`);
				this.startInterRoundCountdown();
				return;
			}
		}

		this.broadcast({
			type: 'gameState',
			state: {
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				score: this.gameState.score,
				tournament: this.gameState.tournament
			},
			timestamp: Date.now()
		});

		this.broadcast({
			type: 'hud',
			currentRound: this.gameState.tournament.currentRound,
			roundsWon: this.gameState.tournament.roundsWon,
			score: this.gameState.score,
			scoreLimit: this.gameState.tournament.scoreLimit,
			status: this.gameState.tournament.gameStatus
		});

		this.lastActivity = Date.now();
	}

	startInterRoundCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		logger.info(`[GameRoom] 📊 Round ${this.gameState.tournament.currentRound} complete!`);

		this.gameState.tournament.gameStatus = 'roundCountdown';

		let count = 3;

		this.broadcast({
			type: 'countdown',
			count,
			message: `Round ${this.gameState.tournament.currentRound} complete! Next round in...`
		});

		this.countdownInterval = setInterval(() => {
			count--;

			if (count > 0) {
				this.broadcast({
					type: 'countdown',
					count
				});
			} else {
				this.broadcast({
					type: 'countdown',
					count: 0
				});
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;

				startRemoteNextRound(this.gameState);

				this.broadcast({
					type: 'roundStart',
					currentRound: this.gameState.tournament.currentRound,
					roundsWon: this.gameState.tournament.roundsWon,
					message: `Round ${this.gameState.tournament.currentRound} - Fight!`
				});
			}
		}, 1000);
	}

	async endGame(winner) {
		logger.info(`[GameRoom] 🏆 Match ended! Winner: P${winner}`);

		this.stopGame();

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'gameEnd';
			this.gameState.tournament.winner = `player${winner}`;
		}

		const roundsWon = this.gameState.tournament.roundsWon;
		const finalRoundScore = this.gameState.score;

		const totalScoreP1 = (roundsWon.player1 * 5) + (roundsWon.player2 > 0 ? finalRoundScore.player1 : 0);
		const totalScoreP2 = (roundsWon.player2 * 5) + (roundsWon.player1 > 0 ? finalRoundScore.player2 : 0);

		if (this.matchId && this.gameState) {
			const playersArray = Array.from(this.players.values());
			const winnerUserId = playersArray[winner - 1]?.info.userId;

			if (winnerUserId) {
				await finishRemoteMatch(
					this.matchId,
					winnerUserId,
					totalScoreP1,
					totalScoreP2
				);
			}
		}

		this.broadcast({
			type: 'gameEnd',
			winner,
			finalScores: this.gameState.score,
			roundsWon: this.gameState.tournament.roundsWon,
			matchDuration: Date.now() - this.createdAt
		});

		this.lastActivity = Date.now();
	}

	async updatePaddle(playerId, direction) {
		const player = this.players.get(playerId);

		if (!player || !this.gameState || !this.isPlaying || this.isPaused) {
			return;
		}

		if (this.gameState.tournament.gameStatus !== 'playing') {
			return;
		}

		const playerKey = `player${player.playerNumber}`;
		moveRemotePaddle(this.gameState, playerKey, direction);
	}

	broadcast(message, excludePlayerId = null) {
		const messageStr = JSON.stringify(message);

		this.players.forEach((player, playerId) => {
			if (playerId === excludePlayerId) {
				return;
			}

			if (player.socket.readyState === 1) {
				try {
					player.socket.send(messageStr);
				} catch (error) {
					logger.error(`[GameRoom] Error sending to ${playerId}:`, error);
				}
			}
		});
	}

	sendToPlayer(playerId, message) {
		const player = this.players.get(playerId);

		if (!player || player.socket.readyState !== 1) {
			return;
		}

		try {
			player.socket.send(JSON.stringify(message));
		} catch (error) {
			logger.error(`[GameRoom] Error sending to ${playerId}:`, error);
		}
	}

	isFull() {
		// Count only connected players
		const connectedPlayers = Array.from(this.players.values()).filter(
			p => p.status === 'connected'
		).length;
		return connectedPlayers >= this.maxPlayers;
	}

	isEmpty() {
		return this.players.size === 0;
	}

	allPlayersReady() {
		if (this.players.size < this.maxPlayers) {
			return false;
		}

		for (const [playerId, player] of this.players.entries()) {
			if (player.status !== 'connected' || !player.ready) {
				return false;
			}
		}

		return true;
	}

	getPlayerNumber(playerId) {
		const player = this.players.get(playerId);
		return player ? player.playerNumber : null;
	}

	getState() {
		return this.gameState;
	}

	getInfo() {
		const playersInfo = [];

		this.players.forEach((player, playerId) => {
			if (player.status === 'connected') {
				playersInfo.push({
					playerId,
					playerNumber: player.playerNumber,
					ready: player.ready,
					username: player.info.username,
					status: player.status
				});
			}
		});

		return {
			roomId: this.roomId,
			players: playersInfo,
			totalPlayers: this.players.size,
			maxPlayers: this.maxPlayers,
			isPlaying: this.isPlaying,
			isPaused: this.isPaused,
			isFull: this.isFull(),
			createdAt: this.createdAt,
			lastActivity: this.lastActivity,
			gameState: this.gameState ? {
				score: this.gameState.score,
				tournament: this.gameState.tournament
			} : null
		};
	}
}