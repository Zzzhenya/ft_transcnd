// transcendence/services/game-service/src/room/GameRoom.js
// FIXED VERSION - Addresses countdown visibility and multi-round issues

import { initialGameState, moveBall, movePaddle } from '../pong/gameLogic.js';
import logger from '../utils/logger.js';

function safePaddleSet(gameState, player, value, source) {
	// Trim verbose debug logs to reduce I/O overhead
	if (isNaN(value)) {
		logger.warn(`[GameRoom] Attempted to set ${player} to NaN from ${source}. Resetting to 0.`);
		gameState.paddles[player] = 0;
	} else {
		gameState.paddles[player] = value;
	}
}


export class GameRoom {
	constructor(roomId) {
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

		logger.info(`[GameRoom] Room ${roomId} created`);
	}

	createInitialGameState() {
		const state = initialGameState();

		state.paddles.player1 = 0;
		state.paddles.player2 = 0;

		// Configure for best of 3 rounds; first to 5 points per round
		state.tournament.maxRounds = 3;
		state.tournament.scoreLimit = 5;
		state.tournament.currentRound = 1;
		state.tournament.roundsWon = { player1: 0, player2: 0 };
		state.tournament.gameStatus = 'waiting';
		// Track total points across all rounds for persistence
		state.tournament.totalPoints = { player1: 0, player2: 0 };

		logger.info(`[GameRoom] Created initial game state`, {
			maxRounds: state.tournament.maxRounds,
			scoreLimit: state.tournament.scoreLimit
		});

		return state;
	}

	addPlayer(playerId, socket, playerInfo = {}) {
		if (this.players.size >= this.maxPlayers) {
			logger.warn(`[GameRoom] ${this.roomId} is full`);
			return false;
		}

		if (this.players.has(playerId)) {
			logger.warn(`[GameRoom] Player ${playerId} already in room ${this.roomId}`);
			return false;
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

	startCountdown() {
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
			this.countdownInterval = null;
		}

		logger.info(`[GameRoom] 🕐 Starting countdown in room ${this.roomId}`);

		let count = 3;

		// FIX: Broadcast initial countdown value immediately
		this.broadcast({
			type: 'countdown',
			count
		});

		this.countdownInterval = setInterval(() => {
			count--;

			if (count > 0) {
				// FIX: Continue broadcasting countdown
				this.broadcast({
					type: 'countdown',
					count
				});
				logger.info(`[GameRoom] Countdown: ${count}`);
			} else {
				// FIX: Broadcast "GO!" (count = 0)
				this.broadcast({
					type: 'countdown',
					count: 0
				});

				clearInterval(this.countdownInterval);
				this.countdownInterval = null;

				logger.info(`[GameRoom] 🎮 Countdown finished! Starting game...`);

				// Small delay before starting game to show "GO!"
				setTimeout(() => {
					this.startGame();
				}, 500);
			}
		}, 1000);
	}

	startGame() {
		if (this.isPlaying) {
			logger.warn(`[GameRoom] Game already started in room ${this.roomId}`);
			return;
		}

		logger.info(`[GameRoom] 🚀 Starting game in room ${this.roomId}`);

		this.gameState = this.createInitialGameState();

		logger.info(`[DEBUG] Initial state from createInitialGameState():`, {
			paddle1: this.gameState.paddles.player1,
			paddle2: this.gameState.paddles.player2,
			paddle1_type: typeof this.gameState.paddles.player1,
			paddle2_type: typeof this.gameState.paddles.player2,
		});

		// Reset paddles
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

		// FIX: Handle round countdown state
		if (this.gameState.tournament.gameStatus === 'roundCountdown') {
			// During countdown, don't move the ball
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
			return;
		}

		if (this.gameState.tournament.gameStatus !== 'playing') {
			return;
		}

		this.gameState = moveBall(this.gameState);

		// Check for round win (not game win yet)
		const roundWinner = this.checkRoundWin();
		if (roundWinner) {
			this.endRound(roundWinner);
			return;
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

		this.lastActivity = Date.now();
	}

	checkRoundWin() {
		if (!this.gameState) return null;

		const scoreLimit = this.gameState.tournament.scoreLimit;

		if (this.gameState.score.player1 >= scoreLimit) {
			return 1;
		}
		if (this.gameState.score.player2 >= scoreLimit) {
			return 2;
		}

		return null;
	}

	endRound(roundWinner) {
		logger.info(`[GameRoom] 🏆 Round ${this.gameState.tournament.currentRound} ended, winner: P${roundWinner}`);

		// Aggregate total points across rounds
		this.gameState.tournament.totalPoints.player1 += this.gameState.score.player1;
		this.gameState.tournament.totalPoints.player2 += this.gameState.score.player2;

		// Update rounds won
		const winnerKey = `player${roundWinner}`;
		this.gameState.tournament.roundsWon[winnerKey]++;

		// Check if someone won the match (best of 3 = 2 rounds needed)
		const roundsToWin = Math.ceil(this.gameState.tournament.maxRounds / 2);

		if (this.gameState.tournament.roundsWon[winnerKey] >= roundsToWin) {
			// Game over!
			this.endGame(roundWinner);
		} else {
			// Start next round
			this.startRoundCountdown();
		}
	}

	// FIX: New method for countdown between rounds
	startRoundCountdown() {
		logger.info(`[GameRoom] Starting countdown for next round...`);

		this.gameState.tournament.gameStatus = 'roundCountdown';
		this.gameState.tournament.nextRoundNumber = this.gameState.tournament.currentRound + 1;
		this.gameState.tournament.nextRoundCountdown = 3;

		// Broadcast round end info
		this.broadcast({
			type: 'roundEnd',
			roundNumber: this.gameState.tournament.currentRound,
			roundsWon: this.gameState.tournament.roundsWon,
			nextRound: this.gameState.tournament.nextRoundNumber
		});

		// Start countdown interval
		if (this.countdownInterval) {
			clearInterval(this.countdownInterval);
		}

		this.countdownInterval = setInterval(() => {
			this.gameState.tournament.nextRoundCountdown--;

			this.broadcast({
				type: 'roundCountdown',
				count: this.gameState.tournament.nextRoundCountdown,
				nextRound: this.gameState.tournament.nextRoundNumber
			});

			if (this.gameState.tournament.nextRoundCountdown <= 0) {
				clearInterval(this.countdownInterval);
				this.countdownInterval = null;
				this.startNextRound();
			}
		}, 1000);
	}

	startNextRound() {
		logger.info(`[GameRoom] 🎮 Starting round ${this.gameState.tournament.nextRoundNumber}`);

		// Increment round number
		this.gameState.tournament.currentRound = this.gameState.tournament.nextRoundNumber;

		// Reset scores for new round
		this.gameState.score.player1 = 0;
		this.gameState.score.player2 = 0;

		// Reset paddles
		safePaddleSet(this.gameState, 'player1', 0, 'startNextRound');
		safePaddleSet(this.gameState, 'player2', 0, 'startNextRound');

		// Reset ball
		this.gameState.ball.x = 0;
		this.gameState.ball.y = 0;
		this.gameState.ball.dx = Math.random() > 0.5 ? 2 : -2;
		this.gameState.ball.dy = (Math.random() - 0.5) * 4;

		// Set status to playing
		this.gameState.tournament.gameStatus = 'playing';
		this.gameState.tournament.nextRoundCountdown = 0;

		// Broadcast new round start
		this.broadcast({
			type: 'roundStart',
			roundNumber: this.gameState.tournament.currentRound,
			gameState: {
				score: this.gameState.score,
				ball: this.gameState.ball,
				paddles: this.gameState.paddles,
				tournament: this.gameState.tournament
			}
		});
	}

	endGame(winner) {
		logger.info(`[GameRoom] 🏆 Game ended in room ${this.roomId}, winner: P${winner}`);

		// Add last round points to total
		if (this.gameState) {
			this.gameState.tournament.totalPoints.player1 += this.gameState.score.player1;
			this.gameState.tournament.totalPoints.player2 += this.gameState.score.player2;
		}

		this.stopGame();

		if (this.gameState) {
			this.gameState.tournament.gameStatus = 'gameEnd';
			this.gameState.tournament.winner = `player${winner}`;
		}

		this.broadcast({
			type: 'gameEnd',
			winner,
			finalScores: this.gameState.score,
			roundsWon: this.gameState.tournament.roundsWon,
			totalPoints: this.gameState.tournament.totalPoints,
			matchDuration: Date.now() - this.createdAt
		});

		this.lastActivity = Date.now();
	}

	updatePaddle(playerId, direction) {
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

		// FIX: Allow paddle movement during roundCountdown too
		if (this.gameState.tournament.gameStatus !== 'playing' &&
			this.gameState.tournament.gameStatus !== 'roundCountdown') {
			logger.warn(`[GameRoom] updatePaddle: tournament status is ${this.gameState.tournament.gameStatus}`);
			return;
		}

		const playerKey = `player${player.playerNumber}`;

		// Reduce noisy paddle logs for performance
		// logger.info(`[GameRoom] BEFORE movePaddle: ${playerKey}=${this.gameState.paddles[playerKey]}, direction=${direction}`);

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
		}

		newPos = Math.max(topBoundary, Math.min(bottomBoundary, newPos));

		safePaddleSet(this.gameState, playerKey, newPos, 'updatePaddle');

		// logger.info(`[GameRoom] AFTER movePaddle: ${playerKey}=${this.gameState.paddles[playerKey]}`);
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