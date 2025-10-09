import type { GameConfig, GameState } from "../game/state";
import { courtRect } from "@/game/system";

export function drawFrame(
	ctx: CanvasRenderingContext2D,
	state: GameState,
	cfg: GameConfig
) {
	const { width, height } = cfg.court;

	// Court blank
	const { x: innerX, y: innerY, w: innerW, h: innerH } = courtRect(cfg);
	ctx.clearRect(0, 0, width, height);

	// Outline for court
	ctx.save();
	ctx.lineWidth = 2;
	ctx.strokeStyle = "#222";
	ctx.strokeRect(innerX, innerY, innerW, innerH);
	ctx.restore();

	// Center line
	ctx.save();
	ctx.globalAlpha = 0.1;
	ctx.fillRect(width / 2 - 1, innerY, 2, innerH);
	ctx.restore();

	// Paddles
	ctx.fillRect(
		state.leftPaddle.posX,
		state.leftPaddle.posY,
		cfg.paddle.width,
		cfg.paddle.height
	);
	ctx.fillRect(
		state.rightPaddle.posX,
		state.rightPaddle.posY,
		cfg.paddle.width,
		cfg.paddle.height
	);

	// Ball
	ctx.beginPath();
	ctx.arc(state.ball.pos.x, state.ball.pos.y, state.ball.radius, 0, Math.PI * 2);
	ctx.fill();

	// Scores: Upper left, right side
	ctx.font = "20px sans-serif";
	ctx.textAlign = "left";
	ctx.fillText(`LEFT: ${state.score.left}`, innerX, innerY - 14);
	ctx.textAlign = "right";
	ctx.fillText(`RIGHT: ${state.score.right}`, innerX + innerW, innerY - 14);

	// Rounds: Upper center
	ctx.font = "bold 24px sans-serif";
	ctx.textAlign = "center";
	ctx.fillText(`Round ${state.round}`, innerX + innerW / 2, innerY - 14);

	// roundWins: Bottom left, right side
	ctx.font = "14px sans-serif";
	ctx.textAlign = "left";
	ctx.fillText(`Wins: ${state.roundWins.left}`, innerX, innerY + innerH + 24);
	ctx.textAlign = "right";
	ctx.fillText(`Wins: ${state.roundWins.right}`, innerX + innerW, innerY + innerH + 24);

	// Winner from last round
	if (state.roundWinner) {
		ctx.textAlign = "center";
		ctx.font = "14px sans-serif";
		ctx.fillText(
			`Last round: ${state.roundWinner.toUpperCase()} win`,
			innerX + innerW / 2,
			innerY + innerH + 24
		);
	}

	// Ending message (After finishing all rounds)
	if (state.status === "ended" && state.winner)
	{
		ctx.font = "bold 32px sans-serif";
		ctx.textAlign = "center";
		ctx.fillText(`WIN: ${state.winner.toUpperCase()}`, width / 2, height / 2 - 20);
	}
}
