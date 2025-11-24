// transcendence/services/game-service/src/pong/remoteGameLogic.js
// COMPLETE FIX: EVEN SLOWER ball for remote play

import logger from '../utils/logger.js';

export const REMOTE_GAME_CONFIG = {
	paddle: {
		width: 2,
		height: 40,
		speed: 20  // Increased from 15 to 20
	},
	ball: {
		radius: 2,
		speed: 0.95,       // Slightly slower: was 1.1, now 0.95
		bounceSpeed: 1.4   // Slightly slower: was 1.6, now 1.4
	},
	court: {
		width: 100,
		height: 200
	},
	rounds: {
		maxRounds: 3,
		scoreLimit: 5,
		roundsToWin: 2
	}
};

export function initialRemoteGameState() {
	return {
		score: { player1: 0, player2: 0 },
		ball: { x: 0, y: 0, dx: 1, dy: 0.5 },
		paddles: { player1: 0, player2: 0 },
		tournament: {
			currentRound: 1,
			maxRounds: REMOTE_GAME_CONFIG.rounds.maxRounds,
			scoreLimit: REMOTE_GAME_CONFIG.rounds.scoreLimit,
			roundsWon: { player1: 0, player2: 0 },
			gameStatus: 'waiting',
			winner: null,
			lastPointWinner: null
		}
	};
}

export function moveRemotePaddle(gameState, player, direction) {
	const paddleSpeed = REMOTE_GAME_CONFIG.paddle.speed;
	const paddleHeight = REMOTE_GAME_CONFIG.paddle.height;

	const topBoundary = -100 + paddleHeight / 2;
	const bottomBoundary = 100 - paddleHeight / 2;

	const playerKey = player;
	let currentPos = gameState.paddles[playerKey];

	if (direction === 'up') {
		currentPos += paddleSpeed;
	} else if (direction === 'down') {
		currentPos -= paddleSpeed;
	}

	gameState.paddles[playerKey] = Math.max(topBoundary, Math.min(bottomBoundary, currentPos));

	return gameState;
}

export function moveRemoteBall(gameState) {
	if (gameState.tournament.gameStatus !== 'playing') {
		return gameState;
	}

	const config = REMOTE_GAME_CONFIG;
	const paddleHeight = config.paddle.height;
	const paddleWidth = config.paddle.width;
	const paddleX = 50;
	const ballRadius = config.ball.radius;
	const ballSpeed = config.ball.speed;  // Now 0.8 - MUCH SLOWER!

	// Move ball
	gameState.ball.x += gameState.ball.dx * ballSpeed;
	gameState.ball.y += gameState.ball.dy * ballSpeed;

	// Wall collisions
	if (gameState.ball.y >= 96) {
		gameState.ball.y = 96;
		gameState.ball.dy *= -1;
	} else if (gameState.ball.y <= -96) {
		gameState.ball.y = -96;
		gameState.ball.dy *= -1;
	}

	function bounceOffPaddle(paddleY) {
		const relativeY = gameState.ball.y - paddleY;
		const normalizedY = relativeY / (paddleHeight / 2);

		const bounceSpeed = config.ball.bounceSpeed;  // Now 1.2 - MUCH SLOWER!

		gameState.ball.dx = gameState.ball.dx > 0 ? -bounceSpeed : bounceSpeed;
		gameState.ball.dy = normalizedY * bounceSpeed;
	}

	// Left paddle collision
	const leftPaddleInnerEdge = -paddleX + paddleWidth;
	if (
		gameState.ball.x - ballRadius <= leftPaddleInnerEdge &&
		gameState.ball.x >= -paddleX - 5 &&
		gameState.ball.dx < 0 &&
		gameState.ball.y >= gameState.paddles.player1 - paddleHeight / 2 &&
		gameState.ball.y <= gameState.paddles.player1 + paddleHeight / 2
	) {
		gameState.ball.x = leftPaddleInnerEdge + ballRadius;
		bounceOffPaddle(gameState.paddles.player1);
	}

	// Right paddle collision
	const rightPaddleInnerEdge = paddleX - paddleWidth;
	if (
		gameState.ball.x + ballRadius >= rightPaddleInnerEdge &&
		gameState.ball.x <= paddleX + 5 &&
		gameState.ball.dx > 0 &&
		gameState.ball.y >= gameState.paddles.player2 - paddleHeight / 2 &&
		gameState.ball.y <= gameState.paddles.player2 + paddleHeight / 2
	) {
		gameState.ball.x = rightPaddleInnerEdge - ballRadius;
		bounceOffPaddle(gameState.paddles.player2);
	}

	// Scoring
	if (gameState.ball.x < -50) {
		logger.info(`[RemoteGame] Player 2 scored! Round ${gameState.tournament.currentRound}`);
		gameState.score.player2++;
		gameState.tournament.lastPointWinner = 'player2';
		checkRemoteRoundEnd(gameState);
		resetRemoteBall(gameState, 'player1');
	} else if (gameState.ball.x > 50) {
		logger.info(`[RemoteGame] Player 1 scored! Round ${gameState.tournament.currentRound}`);
		gameState.score.player1++;
		gameState.tournament.lastPointWinner = 'player1';
		checkRemoteRoundEnd(gameState);
		resetRemoteBall(gameState, 'player2');
	}

	return gameState;
}

function resetRemoteBall(gameState, direction = null) {
	gameState.ball.x = 0;
	gameState.ball.y = 0;

	if (direction === 'player1') {
		gameState.ball.dx = -1;
	} else if (direction === 'player2') {
		gameState.ball.dx = 1;
	} else {
		gameState.ball.dx = Math.random() > 0.5 ? 1 : -1;
	}

	gameState.ball.dy = (Math.random() - 0.5) * 2;
}

function checkRemoteRoundEnd(gameState) {
	const scoreLimit = gameState.tournament.scoreLimit;

	logger.info(`[RemoteGame] checkRemoteRoundEnd - P1: ${gameState.score.player1}/${scoreLimit}, P2: ${gameState.score.player2}/${scoreLimit}`);

	if (gameState.score.player1 >= scoreLimit) {
		gameState.tournament.roundsWon.player1++;
		logger.info(`[RemoteGame] 🏆 Player 1 wins Round ${gameState.tournament.currentRound}! (Rounds: P1=${gameState.tournament.roundsWon.player1}, P2=${gameState.tournament.roundsWon.player2})`);
		const matchOver = endRemoteRound(gameState, 'player1');
		logger.info(`[RemoteGame] endRemoteRound returned: ${matchOver}, gameStatus is now: ${gameState.tournament.gameStatus}`);
		return matchOver;
	} else if (gameState.score.player2 >= scoreLimit) {
		gameState.tournament.roundsWon.player2++;
		logger.info(`[RemoteGame] 🏆 Player 2 wins Round ${gameState.tournament.currentRound}! (Rounds: P1=${gameState.tournament.roundsWon.player1}, P2=${gameState.tournament.roundsWon.player2})`);
		const matchOver = endRemoteRound(gameState, 'player2');
		logger.info(`[RemoteGame] endRemoteRound returned: ${matchOver}, gameStatus is now: ${gameState.tournament.gameStatus}`);
		return matchOver;
	}

	return false;
}

export function endRemoteRound(gameState, roundWinner) {
	const roundsToWin = REMOTE_GAME_CONFIG.rounds.roundsToWin;
	
	logger.info(`[RemoteGame] endRemoteRound called - roundWinner: ${roundWinner}, roundsWon: P1=${gameState.tournament.roundsWon.player1}, P2=${gameState.tournament.roundsWon.player2}, roundsToWin: ${roundsToWin}`);

	// Check if match is over FIRST
	if (gameState.tournament.roundsWon[roundWinner] >= roundsToWin) {
		gameState.tournament.gameStatus = 'gameEnd';
		gameState.tournament.winner = roundWinner;

		logger.info(`[RemoteGame] 🎉 MATCH OVER! ${roundWinner} wins ${gameState.tournament.roundsWon[roundWinner]}-${gameState.tournament.roundsWon[roundWinner === 'player1' ? 'player2' : 'player1']}!`);
		logger.info(`[RemoteGame] gameStatus set to: ${gameState.tournament.gameStatus}, winner set to: ${gameState.tournament.winner}`);

		return true;
	} else {
		// Round ended but match continues
		gameState.tournament.gameStatus = 'roundEnd';
		logger.info(`[RemoteGame] Round ${gameState.tournament.currentRound} complete. Match continues. gameStatus: ${gameState.tournament.gameStatus}`);
		return false;
	}
}

export function startRemoteNextRound(gameState) {
	gameState.tournament.currentRound++;

	gameState.score.player1 = 0;
	gameState.score.player2 = 0;

	gameState.paddles.player1 = 0;
	gameState.paddles.player2 = 0;

	resetRemoteBall(gameState);

	gameState.tournament.gameStatus = 'playing';

	logger.info(`[RemoteGame] 🆕 Round ${gameState.tournament.currentRound} started!`);
}

export function startRemoteGame(gameState) {
	gameState.tournament.gameStatus = 'playing';
	resetRemoteBall(gameState);
	logger.info(`[RemoteGame] 🎮 Game started!`);
}

export default {
	REMOTE_GAME_CONFIG,
	initialRemoteGameState,
	moveRemotePaddle,
	moveRemoteBall,
	endRemoteRound,
	startRemoteNextRound,
	startRemoteGame
};