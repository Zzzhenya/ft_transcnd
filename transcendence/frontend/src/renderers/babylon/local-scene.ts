// frontend/src/renderers/babylon/local-scene.ts
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export type GameRenderState = {
  ball: { x: number; y: number };
  paddles: { player1: number; player2: number };
  score: { player1: number; player2: number };
  match: {
    roundsWon: { player1: number; player2: number };
    winner: string | null;
    currentRound: number;
  };
  gameStatus: string;
};

export type LocalSceneController = {
  update: (state: GameRenderState) => void;
  dispose: () => void;
};

export function createLocalScene(canvas: HTMLCanvasElement): LocalSceneController {
  // ---------- Engine / Scene ----------
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  engine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#0A0015FF");
  engine.resize();
  // ---------- Camera ----------
	const camera = new BABYLON.ArcRotateCamera(
		"camera",
		-Math.PI / 2,
		BABYLON.Tools.ToRadians(60),
		12,
		new BABYLON.Vector3(0, -0.5, 0), // 2nd param: court's y-axis.
		scene
	);
	// Expose scene and camera on the canvas for optional external adjustments (e.g., remote page)
	try {
		(canvas as any).__babylonScene = scene;
		(canvas as any).__babylonCamera = camera;
	} catch {}
	camera.inputs.clear();
	camera.panningSensibility = 0;
	camera.minZ = 0.1;
	camera.maxZ = 1000;
	camera.lowerRadiusLimit = 12;
	camera.upperRadiusLimit = 12;
	camera.fov = 0.6;

  // ---------- Lights ----------
  const hemiLight = new BABYLON.HemisphericLight(
    "hemiLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.8;

  const dirLight = new BABYLON.DirectionalLight(
    "dirLight",
    new BABYLON.Vector3(-0.5, -1, 0.3),
    scene
  );
  dirLight.intensity = 0.6;

  // ---------- Helpers: 좌표 변환 ----------
  // 기존 로직:
  //   x: -50 ~ +50
  //   y: -100 ~ +100
  // 여기서는:
  //   X축: 좌우
  //   Z축: 위/아래
  //   Y축: 높이
  const WORLD_X_SCALE = 0.08;   // -50~50 -> -5~5
  const WORLD_Z_SCALE = 0.04;  // -100~100 -> -8~8

  function logicToWorldX(x: number) {
    return x * WORLD_X_SCALE;
  }
  function logicToWorldZ(y: number) {
    return y * WORLD_Z_SCALE;
  }

  // ---------- Court / Table ----------
  const courtWidth = (50 - -50) * WORLD_X_SCALE;
  const courtHeight = (100 - -100) * WORLD_Z_SCALE;

  const court = BABYLON.MeshBuilder.CreateGround("court", {
    width: courtWidth + 0.5,
    height: courtHeight + 0.5,
  }, scene);

  const courtMat = new BABYLON.StandardMaterial("courtMat", scene);
  courtMat.diffuseColor = BABYLON.Color3.FromHexString("#5E2DD4");
  courtMat.specularColor = BABYLON.Color3.Black();
  court.material = courtMat;

  // 중앙 라인
  const centerLine = BABYLON.MeshBuilder.CreateBox("centerLine", {
    width: 0.06,
    height: 0.02,
    depth: courtHeight * 0.96,
  }, scene);
  centerLine.position = new BABYLON.Vector3(0, 0.02, 0);
  const centerMat = new BABYLON.StandardMaterial("centerMat", scene);
  centerMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
  centerMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
  centerLine.material = centerMat;

  // ---------- Paddles ----------
  const paddleThickness = 0.25;
  const paddleHeightWorld = 40 * WORLD_Z_SCALE;

  const leftPaddle = BABYLON.MeshBuilder.CreateBox("leftPaddle", {
    width: 0.4,
    height: 0.4,
    depth: paddleHeightWorld,
  }, scene);
  const rightPaddle = leftPaddle.clone("rightPaddle")!;

  const paddleMat = new BABYLON.StandardMaterial("paddleMat", scene);
  paddleMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
  paddleMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
  paddleMat.specularColor = BABYLON.Color3.Black();
  leftPaddle.material = paddleMat;
  rightPaddle.material = paddleMat;

  // 좌우 기본 위치 (x는 고정, z만 state로)
  const leftX = logicToWorldX(-50);
  const rightX = logicToWorldX(50 - 1.5);

  leftPaddle.position = new BABYLON.Vector3(leftX, paddleThickness, 0);
  rightPaddle.position = new BABYLON.Vector3(rightX, paddleThickness, 0);

  // ---------- Ball ----------
  const ball = BABYLON.MeshBuilder.CreateSphere("ball", {
    diameter: 0.5,
    segments: 16,
  }, scene);

  const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
  ballMat.diffuseColor = BABYLON.Color3.FromHexString("#FACC15"); // 노랑 포인트
  ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
  ballMat.specularColor = BABYLON.Color3.Black();
  ball.material = ballMat;

  // Arc / Rally state
  const floorY = 0.25;
  let lastState: GameRenderState | null = null;
  let lastBallX = 0;
  let currentDir: 1 | -1 = 1;

  // Rally parabola (포물선)
  let segStartX = -50;
  let segEndX = 50;
  let arcMaxHeightCurrent = 0.6;    // 최대 높이
  let arcSharpnessCurrent = 2.0;    // 곡률

  let arcStartHeight = floorY;

  // Rule: Must be located in opponent's court
  const BOUNCE_RATIO = 0.55;		// 바운스 위치
  const BOUNCE_PEAK = 1;			// 바운스 튀는 높이
  
  function setupArcSegment(bx: number, dir: 1 | -1, startHeight: number) {
	currentDir = dir;
	segStartX = bx;
	segEndX = dir === 1 ? 50 : -50;

	// 아크 최대 높이와 곡률을 구간마다 랜덤으로 바꿔서 패턴 반복 방지
	arcMaxHeightCurrent = 1.4 + Math.random() * 0.4;
	arcSharpnessCurrent = 1.1 + Math.random() * 0.9;

	arcStartHeight = startHeight;
  }

  // ---------- Render Loop ----------
	engine.runRenderLoop(() => {
		if (lastState) {
			const bx = lastState.ball.x ?? 0;

			let u = (bx - segStartX) / (segEndX - segStartX || 0.0001);
			if (u < 0) u = 0;
			else if (u > 1) u = 1;

			let h: number;

			if (u <= BOUNCE_RATIO) {
				const t = u / (BOUNCE_RATIO || 0.0001); // 0~1
				const base = Math.pow(4 * t * (1 - t), arcSharpnessCurrent); // 가운데가 봉긋한 포물선
				const lerpToFloor = BABYLON.Scalar.Lerp(arcStartHeight, floorY, t);
				h = lerpToFloor + arcMaxHeightCurrent * base;
			} else {
				const v = (u - BOUNCE_RATIO) / (1 - BOUNCE_RATIO || 0.0001); // 0~1
				const base = 4 * v * (1 - v);	
				h = floorY + BOUNCE_PEAK * base;
			}		
			ball.position.y = h;
		}
		scene.render();
	});

  window.addEventListener("resize", onResize);
  function onResize() {
    engine.resize();
  }

  // ---------- Update 구현 ----------
  function update(state: GameRenderState) {
    const prevState = lastState;
	lastState = state;

    // Paddle position
    if (state.paddles) {
      const lp = state.paddles.player1 ?? 0;
      const rp = state.paddles.player2 ?? 0;
      leftPaddle.position.z = logicToWorldZ(lp);
      rightPaddle.position.z = logicToWorldZ(rp);
    }

    // Ball position & Track direction
	if (state.ball) {
		const bx = state.ball.x ?? 0;
		const by = state.ball.y ?? 0;

		// First frame init
		if (!prevState) {
			lastBallX = bx;
      		setupArcSegment(bx, bx >= 0 ? -1 : 1, floorY); // Rounghly init direction
    	}

		// Calc, current moving direction
		let newDir: 1 | -1 = currentDir;
		if (bx > lastBallX + 0.2) { newDir = 1; }
		else if (bx < lastBallX - 0.2) { newDir = -1; }

    	// If direction changes == conflict with paddle or pong
    	if (newDir !== currentDir) {
			const currentBallY = ball.position.y;
			setupArcSegment(bx, newDir, currentBallY);
    	}

		lastBallX = bx;

		// Y(Height) should be calculated by [f]renderLoop with Arc.
		ball.position.x = logicToWorldX(bx);
		ball.position.z = logicToWorldZ(by);
	}

    // 게임 상태에 따라 간단한 연출 (추후 강화)
	if (state.gameStatus === "gameEnd") {
      ballMat.emissiveColor = new BABYLON.Color3(1, 0.3, 0.3);
    } else {
	  ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
	}
  }

  // ---------- Cleanup ----------
  function dispose() {
    window.removeEventListener("resize", onResize);
    scene.dispose();
    engine.dispose();
  }

  // 초기 상태용 안전장치 (필요시)
  if (!lastState) {
    update({
      ball: { x: 0, y: 0 },
      paddles: { player1: 0, player2: 0 },
      score: { player1: 0, player2: 0 },
      match: {
        roundsWon: { player1: 0, player2: 0 },
        winner: null,
        currentRound: 1,
      },
      gameStatus: "waiting",
    });
  }

  return { update, dispose };
}

/*
	1단계: 구조 정리 (Babylon 전용 렌더러 분리)
	2단계: Babylon 기본 세팅
	3단계: 게임 공간 & 좌표계 맞추기
	4단계: 기본 메쉬로 패들/공 구현
	5단계: 네트워크 gameState랑 3D 싱크 연결
	6단계: 키입력 & WS 로직 그대로 유지 (단, 피드백 추가)
	7단계: Blender에서 만든 .glb 모델 적용
	8단계: 카메라 / 라이트 / 연출 강화
	9단계: 정리 & 에러/리소스 관리
*/