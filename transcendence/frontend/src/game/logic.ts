import { DefaultConfig, createBall } from "./state";
import type { GameConfig, GameState, PlayerSide } from "./state";
import { courtRect } from "./system";

// Helpters for [f]:serveBall()
// Generate random number to choose which players start the game first with service.
function pickRandomSide(): PlayerSide {
	if (Math.random() < 0.5)
		return "left";
	return "right";
}

/*
	Generate service ball's angle randomly
	
					   Math.PI
	Radian = degree * --------- 
						 180 

	Why Radian?
	= TS, JS uses Math.sin, Math.cos -> Trigonometric functions (삼각함수)
	= For 삼각함수, should match the unit from 'degree' to 'radian'.

	ex) base
		minRad + Math.random() + (maxRad - minRad);
		= 15 + random(): 0 to 1 * (45 - 15)
		= 15 + 0 * 30		15	// min
		= 15 + 0.5 * 30		30	// mid
		= 15 + 1 * 30		45	// max
		---------------------------------
		Range of Radian: 15 - 45
*/
function randomServeAngleRad(minDeg = 15, maxDeg = 45): number {
	// Assurance: min <= max, if not -> swap min and max.
	if (maxDeg < minDeg) {
		const tmp = minDeg;
		minDeg = maxDeg;
		maxDeg = tmp;
	}

	// Unit conversion for angle (from Degree to Radian)
	const minRad = (minDeg * Math.PI) / 180;
	const maxRad = (maxDeg * Math.PI) / 180;

	// 균등분포 난수를 만드는 전형적인 패턴
	// Pattern to extract uniformly distributed random number between MIN & MAX.
	const baseRad = minRad + Math.random() * (maxRad - minRad);

	// Direction for service is 50% randomly: UP || DOWN
	let sign = 1;
	if (Math.random() < 0.5)
		sign = -1;
	return sign * baseRad;
}

/*
	Why keep a velocity vector (vx, vy)?
	= At serve, convert (speed, angle) -> velocity (vx, vy).
	= With no forces, example reflecting the other's paddle or side wall
	  velocity stays constant until a collision.
	= Each frame:
		pos.x += vx * dt;
		pos.y += vy * dt;
	= Collisions:
		top / bottom walls: vy = -vy;
		left / right paddle: vx = -vx;
		left / right goal: score & reset (no reflection)

	서브 할 때 (speed, angle)를 속도벡터 (vx, vy)로 변환해서 공에 '방향 + 속력'을 저장한다.
	외력이 없으면 충돌 전 까지 속도는 변하지 않으므로,
	매 프레임마다 같은 속력과 방향을 고려해서 공을 이동시킬 수 있다.
*/
export function serveBall(
  state: GameState,
  config: GameConfig = DefaultConfig,
  to: PlayerSide = pickRandomSide()
): void {

	// Check speed and angle of the ball.
	const speed = config.ball.speed;
	const angleRad = randomServeAngleRad(15, 45);
	
	// Direction of ball (-1: -x || 1: x)
	let direction = 1;
	if (to === "left")	// to: left means send the ball right to left. need (-1) direction.
		direction = -1;

	// Place the ball in the middle of the court.
	const r = courtRect(config);
	state.ball.pos.x = r.x + r.w / 2;
	state.ball.pos.y = r.y + r.h / 2;

	// Calculate velocity vector of the ball (vx, vy): formula.
	state.ball.vel.x = Math.cos(angleRad) * speed * direction;
	state.ball.vel.y = Math.sin(angleRad) * speed;

	// Update game status.
	state.status = "playing";
}

export function resetRound(state: GameState, config: GameConfig = DefaultConfig): void {
	const r = courtRect(config);

	// Put paddle's X position back in each outline of court.
	state.leftPaddle.posX  = r.x + config.court.gutter;
	state.rightPaddle.posX = r.right - config.court.gutter - config.paddle.width;
	
	// Put both paddle's Y position back in the middle of the court.
	state.leftPaddle.posY  = r.y + (r.h - config.paddle.height) / 2;
	state.rightPaddle.posY = r.y + (r.h - config.paddle.height) / 2;

	// Put both paddle's vy back to 0. init
	state.leftPaddle.vy = 0;
	state.rightPaddle.vy = 0;

	// Create new ball for new round.
	state.ball = createBall(config);

	// Change status of game.
	state.status = "ready";
}
