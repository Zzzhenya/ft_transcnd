// transcendence/services/game-service/src/room/GameRoom.js
// FIXED: Player disconnect handling + proper match end

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

export class GameRoom {
	constructor(roomId, options = {}) {
		this.roomId = roomId;
		this.players = new Map();
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

		logger.info(`[GameRoom] Room ${roomId} created (type: ${this.gameType})`);
	}

	createInitialGameState() {
		const state = initialRemoteGameState();
		logger.info(`[GameRoom] Created initial remote game state`);
		return state;
	}

	addPlayer(playerId, socket, playerInfo = {}) {
		if (this.players.size >= this.maxPlayers) {
			logger.warn(`[GameRoom] ${this.roomId} is full`);
			return false;
		}

		if (this.players.has(playerId)) {
			const existing = this.players.get(playerId);
			logger.warn(`[GameRoom] Player ${playerId} reconnecting`);

			try {
				if (existing.socket && (existing.socket.readyState === 0 || existing.socket.readyState === 1)) {
					existing.socket.close(1012, 'Replaced by new connection');
				}
			} catch (e) {
				logger.warn(`[GameRoom] Error closing previous socket:`, e);
			}

			existing.socket = socket;
			existing.info = {
				username: playerInfo.username || existing.info?.username || `Player ${existing.playerNumber}`,
				avatar: playerInfo.avatar || existing.info?.avatar || null,
				...playerInfo
			};
			this.players.set(playerId, existing);
			this.lastActivity = Date.now();

			this.sendToPlayer(playerId, {
				type: 'playerReconnected',
				playerId,
				playerNumber: existing.playerNumber
			});

			logger.info(`[GameRoom] Player ${playerId} reconnected as P${existing.playerNumber}`);
			return true;
		}

		const playerNumber = this.players.size + 1;

		this.players.set(playerId, {
			socket,
			playerNumber,
			ready: false,
			info: {
				username: playerInfo.username || `Player ${playerNumber}`,
				avatar: playerInfo.avatar || null,
				...playerInfo
			}
		});

		this.lastActivity = Date.now();

		logger.info(`[GameRoom] Player ${playerId} (P${playerNumber}) joined`);

		this.broadcast({
			type: 'playerJoined',
			playerId,
			playerNumber,
			playerInfo: this.players.get(playerId).info,
			totalPlayers: this.players.size
		}, playerId);

		return true;
	}

	removePlayer(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			return;
		}

		logger.info(`[GameRoom] Player ${playerId} left room ${this.roomId}`);

		this.players.delete(playerId);

		// FIXED: If game is playing, end it and notify
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
		}

		this.lastActivity = Date.now();
	}

	setPlayerReady(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			logger.warn(`[GameRoom] Player ${playerId} not found`);
			return;
		}

		player.ready = true;
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

		this.broadcast({
			type: 'gameStart',
			gameState: {
				score: this.gameState.score,
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				tournament: this.gameState.tournament
			}
		});

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

			// Check if match ended (gameEnd status set by game logic)
			if (this.gameState.tournament.gameStatus === 'gameEnd') {
				logger.info(`[GameRoom] GAME END detected! Winner: ${this.gameState.tournament.winner}, Rounds: P1=${this.gameState.tournament.roundsWon.player1}, P2=${this.gameState.tournament.roundsWon.player2}`);
				const winnerNum = this.gameState.tournament.winner === 'player1' ? 1 : 2;
				logger.info(`[GameRoom] Calling endGame with winner: ${winnerNum}`);
				this.endGame(winnerNum);
				return;
			}

			// Check if round ended after ball movement
			if (this.gameState.tournament.gameStatus === 'roundEnd') {
				logger.info(`[GameRoom] Round ended. Rounds: P1=${this.gameState.tournament.roundsWon.player1}, P2=${this.gameState.tournament.roundsWon.player2}`);
				// Round ended but match continues - start next round
				logger.info(`[GameRoom] Match continues, starting next round`);
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
		logger.info(`[GameRoom] Final: P1=${this.gameState.tournament.roundsWon.player1}, P2=${this.gameState.tournament.roundsWon.player2}`);

		this.stopGame();

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'gameEnd';
			this.gameState.tournament.winner = `player${winner}`;
		}

		if (this.matchId && this.gameState) {
			const playersArray = Array.from(this.players.values());
			const winnerUserId = playersArray[winner - 1]?.info.userId;

			if (winnerUserId) {
				await finishRemoteMatch(
					this.matchId,
					winnerUserId,
					this.gameState.score.player1,
					this.gameState.score.player2
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
		return this.players.size >= this.maxPlayers;
	}

	isEmpty() {
		return this.players.size === 0;
	}

	allPlayersReady() {
		if (this.players.size < this.maxPlayers) {
			return false;
		}

		for (const [playerId, player] of this.players.entries()) {
			if (!player.ready) {
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
			playersInfo.push({
				playerId,
				playerNumber: player.playerNumber,
				ready: player.ready,
				username: player.info.username
			});
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