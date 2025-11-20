// transcendence/services/game-service/src/room/GameRoom.js

import { initialGameState, moveBall, movePaddle, checkRoundEnd, endRound, startNextRound } from '../pong/gameLogic.js';
import logger from '../utils/logger.js';
import { createRemoteMatch, startRemoteMatch, finishRemoteMatch, cancelRemoteMatch } from '../utils/remoteMatchDB.js';

function safePaddleSet(gameState, player, value, source) {
	if (isNaN(value)) {
		logger.error(`[GameRoom] ⚠️ Attempted to set ${player} to NaN from ${source}!`);
		gameState.paddles[player] = 0; // Force to 0 if NaN
	} else {
		gameState.paddles[player] = value;
	}
}


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
		this.matchId = null; // Database match ID
		this.matchStarted = false; // Track if match has been marked as started in DB
		this.gameType = options.gameType || 'remote'; // 'remote' or 'tournament'
		this.tournamentId = options.tournamentId || null; // Tournament ID if applicable

		logger.info(`[GameRoom] Room ${roomId} created (type: ${this.gameType})`);
	}

	createInitialGameState() {
		const state = initialGameState();

		state.paddles.player1 = 0;
		state.paddles.player2 = 0;

		// Configure best of 3 rounds, 5 points each round
		state.tournament.maxRounds = 3;
		state.tournament.scoreLimit = 5;
		state.tournament.gameStatus = 'waiting';

		logger.info(`[GameRoom] Created initial game state:`, {
			paddle1: state.paddles.player1,
			paddle2: state.paddles.player2,
			ball: state.ball
		});

		return state;
	}

	addPlayer(playerId, socket, playerInfo = {}) {
		if (this.players.size >= this.maxPlayers) {
			logger.warn(`[GameRoom] ${this.roomId} is full`);
			return false;
		}

		if (this.players.has(playerId)) {
			// Reconnect logic: replace old socket with the new one for the same playerId
			const existing = this.players.get(playerId);
			logger.warn(`[GameRoom] Player ${playerId} already in room ${this.roomId} - performing reconnect`);
			try {
				if (existing.socket && (existing.socket.readyState === 0 || existing.socket.readyState === 1)) { // CONNECTING or OPEN
					existing.socket.close(1012, 'Replaced by new connection');
				}
			} catch (e) {
				logger.warn(`[GameRoom] Error closing previous socket for player ${playerId}:`, e);
			}

			// Keep playerNumber and ready state; swap socket and info
			existing.socket = socket;
			existing.info = {
				username: playerInfo.username || existing.info?.username || `Player ${existing.playerNumber}`,
				avatar: playerInfo.avatar || existing.info?.avatar || null,
				...playerInfo
			};
			this.players.set(playerId, existing);
			this.lastActivity = Date.now();

			// Notify only the reconnected player (optional)
			this.sendToPlayer(playerId, {
				type: 'playerReconnected',
				playerId,
				playerNumber: existing.playerNumber
			});

			logger.info(`[GameRoom] Player ${playerId} reconnected in room ${this.roomId} as P${existing.playerNumber}`);
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

		logger.info(`[GameRoom] Player ${playerId} (P${playerNumber}) joined room ${this.roomId}`);

		this.broadcast({
			type: 'playerJoined',
			playerId,
			playerNumber,
			playerInfo: this.players.get(playerId).info,
			totalPlayers: this.players.size
		}, playerId);

		// Note: Match creation happens on countdown start, not on join
		return true;
	}

	removePlayer(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			return;
		}

		logger.info(`[GameRoom] Player ${playerId} left room ${this.roomId}`);

		this.players.delete(playerId);

		if (this.isPlaying && !this.isPaused) {
			this.pauseGame();

			this.broadcast({
				type: 'playerDisconnected',
				playerId,
				reason: 'left'
			});
		}

		this.lastActivity = Date.now();
	}

	setPlayerReady(playerId) {
		const player = this.players.get(playerId);

		if (!player) {
			logger.warn(`[GameRoom] Player ${playerId} not found in room ${this.roomId}`);
			return;
		}

		player.ready = true;
		this.lastActivity = Date.now();

		logger.info(`[GameRoom] Player ${playerId} is ready in room ${this.roomId}`);

		this.broadcast({
			type: 'playerReady',
			playerId,
			playerNumber: player.playerNumber
		});

		logger.info(`[GameRoom] Checking if all players ready... (${this.players.size}/${this.maxPlayers})`);

		this.players.forEach((p, id) => {
			logger.info(`  - Player ${id}: ready=${p.ready}`);
		});

		if (this.allPlayersReady()) {
			logger.info(`[GameRoom] ✅ All players ready! Starting countdown...`);
			this.startCountdown();
		} else {
			logger.info(`[GameRoom] ⏳ Waiting for all players to be ready...`);
		}
	}

	async startCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		logger.info(`[GameRoom] 🕐 Starting countdown in room ${this.roomId}`);

		// Ensure gameState exists and is in countdown status to prevent early physics
		if (!this.gameState) this.gameState = this.createInitialGameState();
		this.gameState.tournament.gameStatus = 'roundCountdown';

		// 🎮 DATABASE: Create match when both players are ready
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
				logger.info(`[GameRoom] Countdown: ${count}`);
			} else {
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;
				logger.info(`[GameRoom] 🎮 Countdown finished! Starting game...`);
				// Small grace so 'GO!' can render before physics
				setTimeout(() => this.startGame(), 300);
			}
		}, 1000);
	}

	async createDatabaseMatch() {
		// Only create Remote_Match records for remote games, not tournaments
		if (this.gameType !== 'remote') {
			logger.info(`[GameRoom] Skipping Remote_Match creation for ${this.gameType} game`);
			return;
		}

		// Get player user IDs from playerInfo (must be set when players connect)
		const playersArray = Array.from(this.players.values());
		
		if (playersArray.length !== 2) {
			logger.warn(`[GameRoom] Cannot create DB match: need 2 players, have ${playersArray.length}`);
			return;
		}

		const player1UserId = playersArray[0].info.userId;
		const player2UserId = playersArray[1].info.userId;

		if (!player1UserId || !player2UserId) {
			logger.warn(`[GameRoom] Cannot create DB match: missing user IDs (P1=${player1UserId}, P2=${player2UserId})`);
			return;
		}

		this.matchId = await createRemoteMatch(player1UserId, player2UserId);
		
		if (this.matchId) {
			logger.info(`[GameRoom] ✅ Remote_Match created: ID=${this.matchId}`);
		}
	}

	async startGame() {
		if (this.isPlaying) {
			logger.warn(`[GameRoom] Game already started in room ${this.roomId}`);
			return;
		}

		logger.info(`[GameRoom] 🚀 Starting game in room ${this.roomId}`);

		// 🎮 DATABASE: Mark match as started
		if (this.matchId) {
			await startRemoteMatch(this.matchId);
		}

		// Initialize state once; if countdown created it already, reuse
		if (!this.gameState) this.gameState = this.createInitialGameState();

		
		safePaddleSet(this.gameState, 'player1', 0, 'startGame-init');
		safePaddleSet(this.gameState, 'player2', 0, 'startGame-init');

		this.gameState.tournament.gameStatus = 'playing';
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

		logger.info(`[GameRoom] ✅ Game started, starting game loop...`);

		this.gameLoopInterval = setInterval(() => {
			this.tick();
		}, 1000 / 30);

		this.lastActivity = Date.now();
	}
	pauseGame() {
		if (!this.isPlaying || this.isPaused) {
			return;
		}

		logger.info(`[GameRoom] Pausing game in room ${this.roomId}`);

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

		logger.info(`[GameRoom] Resuming game in room ${this.roomId}`);

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

		logger.info(`[GameRoom] Game stopped in room ${this.roomId}`);
	}

	tick() {
		if (!this.gameState || !this.isPlaying || this.isPaused) {
			return;
		}

		// Handle inter-round countdown
		if (this.gameState.tournament.gameStatus === 'roundCountdown') {
			// Countdown is managed by the countdown interval; just broadcast HUD
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

		if (this.gameState.tournament.gameStatus !== 'playing') {
			return;
		}

		this.gameState = moveBall(this.gameState);

		// Use tournament engine: check if this round reached score limit
		const scoreLimit = this.gameState.tournament.scoreLimit;
		if (this.gameState.score.player1 >= scoreLimit || this.gameState.score.player2 >= scoreLimit) {
			const roundWinner = this.gameState.score.player1 >= scoreLimit ? 'player1' : 'player2';
			endRound(this.gameState, roundWinner);
			
			// Check if match is over (best of 3: need 2 rounds to win)
			const roundsToWin = Math.ceil(this.gameState.tournament.maxRounds / 2);
			if (this.gameState.tournament.roundsWon[roundWinner] >= roundsToWin) {
				// Match over
				this.gameState.tournament.gameStatus = 'gameEnd';
				const winnerNum = roundWinner === 'player1' ? 1 : 2;
				this.endGame(winnerNum);
				return;
			} else {
				// Start inter-round countdown
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
		
		// Broadcast HUD update for round/points
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

		logger.info(`[GameRoom] Starting inter-round countdown in room ${this.roomId}`);
		
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
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;
				logger.info(`[GameRoom] Inter-round countdown finished, starting next round`);
				
				// Start next round
				startNextRound(this.gameState);
				this.gameState.tournament.gameStatus = 'playing';
				
				this.broadcast({
					type: 'roundStart',
					currentRound: this.gameState.tournament.currentRound,
					roundsWon: this.gameState.tournament.roundsWon,
					message: `Round ${this.gameState.tournament.currentRound} - Fight!`
				});
			}
		}, 1000);
	}

	// Deprecated per-round win check. Tournament engine handles multi-round progression.
	checkWinCondition() { return null; }

	async endGame(winner) {
		logger.info(`[GameRoom] 🏆 Game ended in room ${this.roomId}, winner: P${winner}`);

		this.stopGame();

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'gameEnd';
			this.gameState.tournament.winner = `player${winner}`;
		}

		// 🎮 DATABASE: Save match result with rounds and points summary
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

		if (!player) {
			logger.warn(`[GameRoom] updatePaddle: player ${playerId} not found`);
			return;
		}

		if (!this.gameState) {
			logger.warn(`[GameRoom] updatePaddle: no gameState`);
			return;
		}

		if (!this.isPlaying) {
			logger.warn(`[GameRoom] updatePaddle: game not playing`);
			return;
		}

		if (this.isPaused) {
			logger.warn(`[GameRoom] updatePaddle: game paused`);
			return;
		}

		if (this.gameState.tournament.gameStatus !== 'playing') {
			logger.warn(`[GameRoom] updatePaddle: tournament status is ${this.gameState.tournament.gameStatus}`);
			return;
		}

		// 🎮 DATABASE: Mark match as started on first paddle move
		if (this.matchId && !this.matchStarted) {
			this.matchStarted = true;
			await startRemoteMatch(this.matchId);
		}

		const playerKey = `player${player.playerNumber}`;

		const paddleSpeed = 15;
		const topBoundary = -70;
		const bottomBoundary = 70;

		let currentPos = this.gameState.paddles[playerKey];

		if (isNaN(currentPos)) {
			logger.error(`[GameRoom] ⚠️ Paddle was NaN before move! Resetting to 0`);
			currentPos = 0;
		}

		let newPos = currentPos;

		if (direction === 'up') {
			newPos = currentPos + paddleSpeed;
		} else if (direction === 'down') {
			newPos = currentPos - paddleSpeed;
		} else if (direction === 'stop') {
			// Keep current position, no movement
			newPos = currentPos;
		}

		newPos = Math.max(topBoundary, Math.min(bottomBoundary, newPos));

		safePaddleSet(this.gameState, playerKey, newPos, 'updatePaddle');
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
			logger.info(`[GameRoom] Not enough players: ${this.players.size}/${this.maxPlayers}`);
			return false;
		}

		for (const [playerId, player] of this.players.entries()) {
			if (!player.ready) {
				logger.info(`[GameRoom] Player ${playerId} not ready yet`);
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