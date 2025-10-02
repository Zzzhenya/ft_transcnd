// 게임에 필요한 타입, 상태, 설정값 정의.
export type Vec2 = { x: number; y: number };	// pos, vel
export type PlayerSide = "left" | "right";			// Direction for player || direction

/*
	1. vy
		패들(라켓)은 공과 다르게 규칙상 오직 세로방향 (Y)축으로만 움직인다.
		vy는 사용자가 입력하는 키보드 값에 따라 라켓이 움직일 방향을 의미한다.
		-1: 아래		0: 멈춤		1: 위

	2. 벡터 사용 여부
		오브젝트의 형태와 사용 목적에 따라 어떤건 Vec2로 묶어서,
		어떤건 분리된 값 (x,y)로 표현 방식을 다르게 선택했다.

		ex) left play's paddle
			x좌표 항상 12px 고정 -> y좌표만 위/아래로 변경.
			= paddle.y를 별도로 접근하는게 더 단순.

			Ball은 '구'형태라 width, height없이 radius만 알면 위치 추적이 용이하다.
			x,y축 양쪽으로 움직인다. 그래서 velocity도 항상 x,y축을 함께 다뤄야한다.
			그래서 vec2를 사용한다.
*/
export type Paddle = {
	posX: number;		// Position in pixels
	posY: number;
	width: number;		// Size in pixels
	height: number;
	vy: number;			// Current vertical input direction: -1(up) | 0 | 1(down)
	speed: number;		// Pixels per second (Magnitude, 강도 only)
};

export type Ball = {
	pos: Vec2;		// Center position (x, y) of sphere.
	vel: Vec2;		// velocity in pixel / sec.
	radius: number;
};

// To show each player's current score on the scoreboard.
export type Score = {
	left: number;
	right: number;
};

/*
	Gutter:
	패들이 gutter없이 완전히 벽에 붙어 있을 경우,
	패들의 절반이 코트 밖으로 나가거나 충돌 처리 로직이 복잡해진다.
	사용자가 화면을 볼때도 패들이 화면 양쪽 끝까지 갈 경우 답답해보인다.
	이를 위해 gutter를 사용한다.
	ex) x = gutter
		y = court.width - gutter
*/
export type GameConfig = {
	court: { width: number; height: number; gutter: number };
	paddle: { width: number; height: number; speed: number };
	ball: { radius: number; speed: number; };
	winScore: number;		// Score to win
	roundTimeSec: number;	// Time limit for one round. 0: Can't play anymore.
};

/*
	ready	: Before service.
	playing	: In process.
	ended	: Set over.
*/
export type GameStatus = "ready" | "playing" | "ended";

export type GameState = {
	// Info
	status: GameStatus;
	score: Score;
	ball: Ball;
	winner: PlayerSide | null;	// left player || right player || null (Not yet decided)

	// Paddle
	leftPaddle: Paddle;
	rightPaddle: Paddle;

	// Time (ms, all from performance.now() clock)
	elapsedMs: number;		// Accumulated(누적) time
	lastUpdateMs: number;	// Timestamp
	startMs: number;
	remainingMs: number;
};

// Set default GameConfig (Modifiable later)
export const DefaultConfig: GameConfig = {
	court: { width: 960, height: 540, gutter: 24 },	// 16:9 ratio
	paddle: { width: 16, height: 96, speed: 520 },	
	ball: { radius: 8, speed: 420},
	winScore: 5,
	roundTimeSec: 0,
};

// Validate config & error handling
function assertValidConfig(config: GameConfig) {
	const courtWidth = config.court.width;
	const courtHeight = config.court.height;
	const paddleWidth = config.paddle.width;
	const paddleHeight = config.paddle.height;
	const gutter = config.court.gutter;

	if (gutter < 0)
		throw new Error("Gutter must be >= 0");
	if (gutter + paddleWidth > courtWidth)
		throw new Error("Paddle width + gutter exceeds court width");
	if (paddleHeight > courtHeight)
		throw new Error("Paddle height exceeds court height");
}

// Get both paddle's starting 'pos.x' point.
function getPaddleStartPosX(
	playerSide: PlayerSide, config: GameConfig
): number {
	if (playerSide === "left")
		return config.court.gutter;
	return config.court.width - config.court.gutter - config.paddle.width;	
}

/* 
	Factory function: 
	= It refers to a function that makes a specific type (object)
	  into an ‘initialized state.

	---------------------------------------------
	|	gutter							 gutter |
	|	|-----------------------------------|	|
	|	|									|	|
	|	|									|	|
	|	1									2	|
	|	|									|	|
	|	|									|	|
	|	|-----------------------------------|	|
	|	gutter							 gutter |
	---------------------------------------------
												courtWidth
	
	1: Left player's paddle's "x" position 	// fixed with gutter line.
	2: Right player's paddle's "x" position
	= Both paddles move only following by 'y' axis.	
*/
export function createPaddle(
	playerSide: PlayerSide,
	config: GameConfig = DefaultConfig
): Paddle {

	// Validate config
	assertValidConfig(config);

	const courtHeight = config.court.height;
	const paddleWidth = config.paddle.width;
	const paddleHeight = config.paddle.height;
	const paddleSpeed = config.paddle.speed;

	const x = getPaddleStartPosX(playerSide, config);
	const y = (courtHeight - paddleHeight) / 2;

	return {
		posX: x,
		posY: y,
		width: paddleWidth,
		height: paddleHeight,
		vy: 0,
		speed: paddleSpeed,
	};
}

// Create the ball in the center of court. Just create not start to move.
export function createBall(config: GameConfig = DefaultConfig): Ball {
	return {
		pos: { x: config.court.width / 2, y: config.court.height / 2 },
		vel: { x: 0, y: 0 },
		radius: config.ball.radius,
	};
}

// Create new game statements, init elements.
export function createState(config: GameConfig = DefaultConfig): GameState {
	return {
		status: "ready",
		score: { left: 0, right: 0 },
		ball: createBall(config),
			winner: null,
			startMs: Date.now(),
		leftPaddle: createPaddle("left", config),
		rightPaddle: createPaddle("right", config),
		elapsedMs: 0,
		lastUpdateMs: performance.now(),
		remainingMs: config.roundTimeSec * 1000,
	};
}
