import type { GameConfig, GameState } from "./state";
import { courtRect } from "./system";

export function applyInput(
	state: GameState,
	cfg: GameConfig,
	input: { state: { upLeft: boolean; dwLeft: boolean; upRight: boolean; dwRight: boolean; reset: boolean } },
	dt: number
) {
	const L = state.leftPaddle;
	const R = state.rightPaddle;
	const sp = cfg.paddle.speed;

	L.vy = (input.state.upLeft ? -1 : 0) + (input.state.dwLeft ? 1 : 0);
	R.vy = (input.state.upRight ? -1 : 0) + (input.state.dwRight ? 1 : 0);

	L.posY += L.vy * sp * dt;
	R.posY += R.vy * sp * dt;

	const r = courtRect(cfg);
	const minY = r.top;
	const maxY = r.bottom - cfg.paddle.height;

	L.posY = Math.max(minY, Math.min(maxY, L.posY));
	R.posY = Math.max(minY, Math.min(maxY, R.posY));
}

/*
	Test mock local phtsics engine valid
	until finishing to implement engine from backend.

	Progress one frame, when goals -> return scored side.
	return: "left" | "right" | null.
*/
export function stepPhysics(
	state: GameState,
	cfg: GameConfig,
	dt: number
): "left" | "right" | null {

	if (state.status !== "playing")
		return null;

	const b = state.ball;
	const r = b.radius;
	const rec = courtRect(cfg);

	b.pos.x += b.vel.x * dt;
	b.pos.y += b.vel.y * dt;

	// Top / Bottom wall
	if (b.pos.y - r <= rec.top && b.vel.y < 0) {
		b.pos.y = r + rec.top;
		b.vel.y *= -1;
	}
	if (b.pos.y + r >= rec.bottom && b.vel.y > 0) {
		b.pos.y = rec.bottom - r;
		b.vel.y *= -1;
	}
		
	// Paddle collisions
	const hit = (p: typeof state.leftPaddle, dir: "L" | "R") => {
		const inY = b.pos.y >= p.posY && b.pos.y <= p.posY + p.height;
    
		if (!inY)
			return;

		if (dir === "L") {
      		const cond = b.pos.x - r <= p.posX + p.width && b.vel.x < 0 && b.pos.x > p.posX;
      		if (cond) {
				b.pos.x = p.posX + p.width + r;
				b.vel.x *= -1;
				const ratio = (b.pos.y - (p.posY + p.height / 2)) / (p.height / 2);
				b.vel.y += ratio * 60;
      		}
    	}
		else {
      		const cond = b.pos.x + r >= p.posX && b.vel.x > 0 && b.pos.x < p.posX + p.width;
			if (cond) {
				b.pos.x = p.posX - r;
				b.vel.x *= -1;
				const ratio = (b.pos.y - (p.posY + p.height / 2)) / (p.height / 2);
				b.vel.y += ratio * 60;
			}
		}
	};

	// Hit paddle
	hit(state.leftPaddle, "L");
	hit(state.rightPaddle, "R");

	// When getting goal (score)
	if (b.pos.x + r < rec.left)
		return "right";
	if (b.pos.x - r > rec.right)
		return "left";

	return null;
}
