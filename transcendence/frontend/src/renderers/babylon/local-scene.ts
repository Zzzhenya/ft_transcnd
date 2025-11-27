// frontend/src/renderers/babylon/local-scene.ts
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import * as GUI from "@babylonjs/gui";

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
  setSplitView: (enabled: boolean) => void; // Split Camera for each player's view
  ready: Promise<void>;
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
		BABYLON.Tools.ToRadians(-270),
		BABYLON.Tools.ToRadians(70),
		18,
		new BABYLON.Vector3(0, 1, 0),
		scene
	);
	camera.inputs.clear();											// Block camera movement
	camera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());	// Only mouse can control camera
	camera.attachControl(canvas, true);								// Permit to move
	camera.panningSensibility = 0;
	camera.minZ = 0.1;
	camera.maxZ = 1000;
	camera.lowerRadiusLimit = 12;
	camera.upperRadiusLimit = 24;
	camera.fov = 0.3;

	camera.viewport = new BABYLON.Viewport(0, 0, 1, 1);		// 전체화면 view
	camera.lowerBetaLimit = BABYLON.Tools.ToRadians(60);	// Angle control
	camera.upperBetaLimit = BABYLON.Tools.ToRadians(100);	// Angle control

	const leftCamera = camera.clone("leftCamera") as BABYLON.ArcRotateCamera;
	const rightCamera = camera.clone("rightCamera") as BABYLON.ArcRotateCamera;

	// Cloned camera also can't be controled by keyboard.
	leftCamera.inputs.clear();
	leftCamera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());
	rightCamera.inputs.clear();
	rightCamera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());

	// Each camera has own their half view-port on the screen.
	leftCamera.viewport = new BABYLON.Viewport(0, 0, 0.5, 1);
	rightCamera.viewport = new BABYLON.Viewport(0.5, 0, 0.5, 1);

	// Distance (Min, Max) reset
	leftCamera.lowerRadiusLimit  = 0.5;
	leftCamera.upperRadiusLimit  = 50;
	rightCamera.lowerRadiusLimit = 0.5;
	rightCamera.upperRadiusLimit = 50;

	// Init status is only camera on.
	scene.activeCamera = camera;
	scene.activeCameras = [camera];

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

  // Helpers: coordinate
  // Range or coordinate for game-logic (X, Z)
  const LOGIC_X_MIN = -50;
  const LOGIC_X_MAX = 50;
  const LOGIC_Z_MIN = -100;
  const LOGIC_Z_MAX = 100;
 
  let WORLD_X_SCALE = 0.08;   // -50~50 -> -5~5
  let WORLD_Z_SCALE = 0.04;  // -100~100 -> -8~8

  // (LOGIC_X_MAX - LOGIC_X_MIN) * WORLD_X_SCALE;
  let tableDepthWorld = (LOGIC_Z_MAX - LOGIC_Z_MIN) * WORLD_Z_SCALE;

  let tableCenterX = 0;
  let tableCenterZ = 0;

  // scoreBaord안에 점수 넣기.
  let scoreText: GUI.TextBlock | null = null;
  let lastScoreP1 = -1;
  let lastScoreP2 = -1;

  function logicToWorldX(x: number) {
	return tableCenterX + x * WORLD_X_SCALE;
  }

  function logicToWorldZ(z: number) {
	return tableCenterZ + z * WORLD_Z_SCALE;
  }

  function setSplitView(enabled: boolean) {
    if (enabled) {
		const target = new BABYLON.Vector3(tableCenterX, floorY, tableCenterZ);

		leftCamera.target = target;
    	leftCamera.alpha = BABYLON.Tools.ToRadians(0);	// player's eye direction
    	leftCamera.beta  = BABYLON.Tools.ToRadians(70); // bird-eye's view
    	leftCamera.radius = 10;							// Zoom in: lower num.

		rightCamera.target = target;
    	rightCamera.alpha = BABYLON.Tools.ToRadians(180);
    	rightCamera.beta  = BABYLON.Tools.ToRadians(70);
    	rightCamera.radius = 10;

      	scene.activeCameras = [leftCamera, rightCamera];
    } else {
      scene.activeCameras = [camera];
      scene.activeCamera = camera;
    }
  }

  // Court / Table (for Placeholder)
  const courtWidth = (LOGIC_X_MAX - LOGIC_X_MIN) * WORLD_X_SCALE; // 100
  const courtHeight = (LOGIC_Z_MAX- LOGIC_Z_MIN) * WORLD_Z_SCALE; // 200

  let court : BABYLON.AbstractMesh = BABYLON.MeshBuilder.CreateGround(
	"court",
	{
		width: courtWidth,
		height: courtHeight,
	},
	scene
  );
  const courtMat = new BABYLON.StandardMaterial("courtMat", scene);
  courtMat.diffuseColor = BABYLON.Color3.FromHexString("#5E2DD4");
  courtMat.specularColor = BABYLON.Color3.Black();
  court.material = courtMat;

  // Center line (for Placeholder)
  const centerLine = BABYLON.MeshBuilder.CreateBox(
	"centerLine",
	{
    	width: 0.2,
    	height: 0.02,
    	depth: courtHeight * 0.96,
  	},
	scene
  );
  centerLine.position = new BABYLON.Vector3(0, 0.02, 0);
  const centerMat = new BABYLON.StandardMaterial("centerMat", scene);
  centerMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
  centerMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
  centerLine.material = centerMat;
  centerLine.dispose();

  // Paddles (controllers)
  const paddleThickness = 0.5;
  const paddleHeightWorld = 40 * WORLD_Z_SCALE;

  let leftPaddle: BABYLON.AbstractMesh =
  	BABYLON.MeshBuilder.CreateBox(
		"leftPaddle",
		{ width: 0.4, height: 0.4, depth: paddleHeightWorld },
  		scene
	);
  let rightPaddle: BABYLON.AbstractMesh =
  	leftPaddle.clone("rightPaddle", null)!;

  const paddleMat = new BABYLON.StandardMaterial("paddleMat", scene);
  paddleMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
  paddleMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
  paddleMat.specularColor = BABYLON.Color3.Black();
  leftPaddle.material = null;
  rightPaddle.material = null;

  // 좌우 기본 위치 (x는 고정, z만 state로)
  let leftX = logicToWorldX(LOGIC_X_MIN);
  let rightX = logicToWorldX(LOGIC_X_MAX - 1.5);

  leftPaddle.position = new BABYLON.Vector3(leftX, paddleThickness, 0);
  rightPaddle.position = new BABYLON.Vector3(rightX, paddleThickness, 0);

  // Ball (for Placeholder)
  let ball: BABYLON.AbstractMesh =
  	BABYLON.MeshBuilder.CreateSphere(
		"ball",
		{ diameter: 0.5, segments: 16 },
		scene
  	);
  const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
  ballMat.diffuseColor = BABYLON.Color3.FromHexString("#FACC15");
  ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
  ballMat.specularColor = BABYLON.Color3.Black();
  ball.material = ballMat;

  // Arc / Rally state
  const BALL_FLOOR_OFFSET = -0.6		// 공 시작점에서 얼마나 내릴지
  const BASE_ARC_HEIGHT_RATIO = 0.3;	// 높이 비율
  const BASE_ARC_RANDOM_RANGE = 0.3;	// 충돌 후 튀어오르는 비율
  const BOUNCE_HEIGHT_RATIO = 0.7;		// 바운스는 첫 포물선의 70% 높이

  // Rule: Must be located in opponent's court
  let arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
  let BOUNCE_PEAK = arcMaxHeightCurrent * BOUNCE_HEIGHT_RATIO;

  let arcSharpnessCurrent = 1.5;	// 곡률, 크게 의미 없는 초기값. 어차피 변경됨.
  let floorY = 0.1;					// init number
  let arcStartHeight = floorY;

  let lastState: GameRenderState | null = null;
  let lastBallX = 0;
  let currentDir: 1 | -1 = 1;

  // Rally parabola (포물선)
  let segStartX = LOGIC_X_MIN;
  let segEndX = LOGIC_X_MAX;

  function setupArcSegment(bx: number, dir: 1 | -1) {
	currentDir = dir;
	segStartX = bx;
	segEndX = dir === 1 ? LOGIC_X_MAX : LOGIC_X_MIN;

	// 아크 최대 높이와 곡률을 구간마다 랜덤으로 바꿔서 패턴 반복 방지
	const ratio =
		BASE_ARC_HEIGHT_RATIO +
		(Math.random() - 0.5) * BASE_ARC_RANDOM_RANGE;

	arcMaxHeightCurrent = tableDepthWorld * Math.max(ratio, 0.01);
	arcSharpnessCurrent = 1.1 + Math.random() * 0.9;

	BOUNCE_PEAK = arcMaxHeightCurrent * BOUNCE_HEIGHT_RATIO;

	arcStartHeight = floorY;
  }

  let resolveReady: (() => void) | null = null;
  const ready = new Promise<void>((res) => {
    resolveReady = res;
  });

  // Load GLB Models (test2.glb)
  BABYLON.SceneLoader.ImportMesh(
    "",
    "/models/",
    "game3d.glb",
    scene,
    (meshes) => {
	  // 모든 mesh + child mesh 수집
	  const allMeshes: BABYLON.AbstractMesh[] = [];
	  meshes.forEach((m) => {
		if (m instanceof BABYLON.AbstractMesh) allMeshes.push(m);
		m.getChildMeshes().forEach((child) => {
        	if (child instanceof BABYLON.AbstractMesh) allMeshes.push(child);
		});
      });

	  // 이름 별 매핑
      const byName: Record<string, BABYLON.AbstractMesh> = {};
      allMeshes.forEach((m) => {
		if (m.name) byName[m.name] = m;
      }); 

      // 1) Table replace from GLB
      if (byName["table"]) {
        court.dispose();
        court = byName["table"];
        court.name = "court";

		court.computeWorldMatrix(true);
		const bbox = court.getBoundingInfo().boundingBox;

		// 실제 테이블 중심 위치 찾기 (월드좌표 기준)
  		const min = bbox.minimumWorld;
  		const max = bbox.maximumWorld;
		tableCenterX = (min.x + max.x) / 2;
		tableCenterZ = (min.z + max.z) / 2;
		const extentX = max.x - min.x;
  		const extentZ = max.z - min.z;

		// 스케일 재계산
		const logicWidth = LOGIC_X_MAX - LOGIC_X_MIN;   // 100
		const logicDepth = LOGIC_Z_MAX - LOGIC_Z_MIN;   // 200
		const SAFE_EPS = 0.0001;

		let worldWidth: number;
		let worldDepth: number;

		if (Math.abs(extentX) >= Math.abs(extentZ)) {
			worldWidth = extentX;
			worldDepth = extentZ;
		}
		else {
			worldWidth = extentZ;
			worldDepth = extentX;
		}

		WORLD_X_SCALE = (Math.abs(worldWidth) > SAFE_EPS ? worldWidth : SAFE_EPS) / logicWidth;
		WORLD_Z_SCALE = (Math.abs(worldDepth) > SAFE_EPS ? worldDepth : SAFE_EPS) / logicDepth;
	
		tableDepthWorld  = worldDepth;

		const tableTopGuess = max.y;
		floorY = tableTopGuess + BALL_FLOOR_OFFSET;
		arcStartHeight = floorY;
		arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
		BOUNCE_PEAK = tableDepthWorld * 0.025;

		// 패들과 공의 기본 높이, 테이블 상면으로 정렬
		leftPaddle.position.y = floorY + 0.02;
  		rightPaddle.position.y = floorY + 0.02;
		ball.position.y = floorY; // renderLoop에서 다시 h로 셋팅됨.

		// 새 스케일 기반으로 패들 X좌표 위치 재계산
		leftX = logicToWorldX(LOGIC_X_MIN);
		rightX = logicToWorldX(LOGIC_X_MAX - 1.5);
		leftPaddle.position.x = leftX;
		rightPaddle.position.x = rightX;

		leftPaddle.position.z = logicToWorldZ(0);
		rightPaddle.position.z = logicToWorldZ(0);
      }

      // 2) Stadium from GLB
      if (byName["stadium"]) {
        const stadium = byName["stadium"] as BABYLON.AbstractMesh;
        stadium.name = "stadium";

        // stadium의 현재 중심 계산
        stadium.computeWorldMatrix(true);
        const sBox = stadium.getBoundingInfo().boundingBox;
        const sMin = sBox.minimumWorld;
        const sMax = sBox.maximumWorld;
        const sCenter = sMin.add(sMax).scale(0.5);

		// 테이블 중심과 맞추도록 오프셋 적용
        const offset = new BABYLON.Vector3(
          tableCenterX - sCenter.x,
          0,
          tableCenterZ - sCenter.z
        );
        stadium.position.addInPlace(offset);
	  }

	  const scorePanel = allMeshes.find((m) =>
		(m.name ?? "").toLowerCase().startsWith("scoreboard_")
	  );

	 if (scorePanel) {
		// 풀스크린 UI 하나 생성
		const uiTex = GUI.AdvancedDynamicTexture.CreateFullscreenUI("scoreUI", true, scene);

		scoreText = new GUI.TextBlock("scoreText", "0 - 0");
		scoreText.color = "#FFE96B";          // 노란색
		scoreText.fontSize = 72;
		scoreText.outlineColor = "black";     // 외곽선
		scoreText.outlineWidth = 1;
		
		// 이 텍스트를 scoreBoard 메시에 “따라붙게” 만든다
		uiTex.addControl(scoreText);
		scoreText.linkWithMesh(scorePanel);

		// 살짝 위/앞으로 위치 조정하고 싶으면 오프셋
		scoreText.linkOffsetY = 0;  // 필요에 따라 숫자 조절
	  }		

    // 3) Paddles from GLB
	const leftPaddleParts = allMeshes.filter((m) => {
		const name = (m.name ?? "").toLowerCase();
		return name.includes("l_paddle");
	});

	const rightPaddleParts = allMeshes.filter((m) => {
		const name = (m.name ?? "").toLowerCase();
		return name.includes("r_paddle");
	});

	if (leftPaddleParts.length && rightPaddleParts.length) {
		// placeholder 삭제
		leftPaddle.dispose();
		rightPaddle.dispose();
		const leftRoot  = new BABYLON.TransformNode("leftPaddleRoot", scene);
  		const rightRoot = new BABYLON.TransformNode("rightPaddleRoot", scene);
		leftPaddle = leftRoot as unknown as BABYLON.AbstractMesh;
		rightPaddle = rightRoot as unknown as BABYLON.AbstractMesh;
	
		leftPaddleParts.forEach((m) => {
			m.setParent(leftRoot);
		});

		rightPaddleParts.forEach((m) => {
			m.setParent(rightRoot);
		});

		leftRoot.computeWorldMatrix(true);
  		rightRoot.computeWorldMatrix(true);

		leftRoot.position = new BABYLON.Vector3(
    		leftX + 1.5,
    		floorY + 0.3,
    		logicToWorldZ(0)
  		);

		rightRoot.position = new BABYLON.Vector3(
			rightX - 1.5,
			floorY + 0.3,
			logicToWorldZ(0)
		);
	}
	else {
	console.warn(
		"[Babylon] ⚠ l_paddle / r_paddle not found in GLB",
		allMeshes.map((m) => m.name)
	);
	}

	// 4) Ball replace from GLB
	if (byName["ball"]) {
        ball.dispose();
        ball = byName["ball"];
        ball.name = "ballModel";
        ball.position.x = logicToWorldX(0);
  		ball.position.z = logicToWorldZ(0);
  		ball.position.y = floorY;
	}

	// 5) Check, all ready to render for 3D
	if (resolveReady) {
        resolveReady();
        resolveReady = null;
    }
    },
    undefined,
    (scene, message, exception) => {
      console.error("[Babylon] Failed to load test2.glb:", message, exception);
	  if (resolveReady) {
    	resolveReady();
    	resolveReady = null;
      }
    }
  );
  // Updated
	engine.runRenderLoop(() => {
		if (lastState) {
			const bx = lastState.ball.x ?? 0;

			let u = (bx - segStartX) / (segEndX - segStartX || 0.0001);
			if (u < 0) u = 0;
			else if (u > 1) u = 1;

			let h: number;

			if (u <= BOUNCE_HEIGHT_RATIO) {
				const t = u / (BOUNCE_HEIGHT_RATIO || 0.0001); // 0~1
				const base = Math.pow(4 * t * (1 - t), arcSharpnessCurrent); // 가운데가 봉긋한 포물선
				const lerpToFloor = BABYLON.Scalar.Lerp(arcStartHeight, floorY, t);
				h = lerpToFloor + arcMaxHeightCurrent * base;
			} else {
				const v = (u - BOUNCE_HEIGHT_RATIO) / (1 - BOUNCE_HEIGHT_RATIO || 0.0001); // 0~1
				const base = 4 * v * (1 - v);	
				h = floorY + BOUNCE_PEAK * base;
			}		
			ball.position.y = h;
		}
		scene.render();
	});

  // Resize
  function onResize() {
    engine.resize();
  }
  window.addEventListener("resize", onResize);

  // Update
  function update(state: GameRenderState) {
    const prev = lastState;
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
		let bx = state.ball.x ?? 0;
		let by = state.ball.y ?? 0;

		// First frame init
		if (!prev) {
			lastBallX = bx;
      		setupArcSegment(bx, bx >= 0 ? -1 : 1);
    	}

		// Calc, current moving direction
		let newDir: 1 | -1 = currentDir;
		if (bx > lastBallX + 0.2) { newDir = 1; }
		else if (bx < lastBallX - 0.2) { newDir = -1; }

    	// If direction changes == conflict with paddle or pong
    	if (newDir !== currentDir) {
			setupArcSegment(bx, newDir);
    	}

		lastBallX = bx;

		// Y(Height) should be calculated by [f]renderLoop with Arc.
		ball.position.x = logicToWorldX(bx);
		ball.position.z = logicToWorldZ(by);
	}

    // 게임 상태에 따라 간단한 연출 (추후 강화)
	if (state.gameStatus === "gameEnd") {
      ballMat.emissiveColor = new BABYLON.Color3(1, 1, 0.3);
    } else {
	  ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
	}

	const p1 = state.score?.player1 ?? 0;
	const p2 = state.score?.player2 ?? 0;
	if (p1 !== lastScoreP1 || p2 !== lastScoreP2) {
		lastScoreP1 = p1;
		lastScoreP2 = p2;

		if (scoreText) {
			scoreText.text = `${p1} - ${p2}`;
		}
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

  return { update, dispose, setSplitView, ready };
}

/*
	1단계: 구조 정리 (Babylon 전용 렌더러 분리)
	2단계: Babylon 기본 세팅
	3단계: 게임 공간 &. 좌표계 맞추기
	4단계: 기본 메쉬로 패들/공 구현
	5단계: 네트워크 gameState랑 3D 싱크 연결
	6단계: 키입력 & WS 로직 그대로 유지 (단, 피드백 추가)
	7단계: Blender에서 만든 .glb 모델 적용
	8단계: 카메라 / 라이트 / 연출 강화
	9단계: 정리 & 에러/리소스 관리
*/