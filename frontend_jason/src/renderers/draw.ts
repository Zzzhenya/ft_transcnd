import type { GameConfig, GameState } from "../game/state";

export function drawFrame(
	ctx: CanvasRenderingContext2D,
	state: GameState,
	cfg: GameConfig
) {
	const { width, height } = cfg.court;
	ctx.clearRect(0, 0, width, height);

	// center line
	ctx.globalAlpha = 0.1;
	ctx.fillRect(width / 2 - 1, 0, 2, height);
	ctx.globalAlpha = 1;

	// paddles
	ctx.fillRect(state.leftPaddle.posX, state.leftPaddle.posY, cfg.paddle.width, cfg.paddle.height);
	ctx.fillRect(state.rightPaddle.posX, state.rightPaddle.posY, cfg.paddle.width, cfg.paddle.height);

	// ball
	ctx.beginPath();
	ctx.arc(state.ball.pos.x, state.ball.pos.y, state.ball.radius, 0, Math.PI * 2);
	ctx.fill();

	// scores
	ctx.font = "24px sans-serif";
	ctx.textAlign = "center";
	ctx.fillText(String(state.score.left), width * 0.25, 36);
	ctx.fillText(String(state.score.right), width * 0.75, 36);

	// status ??
	if (state.status === "ended")
		ctx.fillText(`WIN: ${state.winner?.toUpperCase()}`, width/2, 64);
}
