// frontend/src/renderers/babylon/local-scene.ts
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

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
		BABYLON.Tools.ToRadians(0),
		BABYLON.Tools.ToRadians(90),
		0,
		new BABYLON.Vector3(0, 1, 0),
		scene
	);
	camera.inputs.clear();
	camera.panningSensibility = 0;
	camera.minZ = 0.1;
	camera.maxZ = 1000;
	camera.lowerRadiusLimit = 12;
	camera.upperRadiusLimit = 12;
	camera.fov = 0.3;

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

  let tableWidthWorld = (LOGIC_X_MAX - LOGIC_X_MIN) * WORLD_X_SCALE;
  let tableDepthWorld = (LOGIC_Z_MAX - LOGIC_Z_MIN) * WORLD_Z_SCALE;

  function logicToWorldX(x: number) {
    return x * WORLD_X_SCALE;
  }
  function logicToWorldZ(y: number) {
    return y * WORLD_Z_SCALE;
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
    	width: 0.06,
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
  const floorY = 0.25;
  const BASE_ARC_HEIGHT_RATIO = 0.3;	// 높이 비율
  const BASE_ARC_RANDOM_RANGE = 0.2;	// 충돌 후 튀어오르는 비율

  let arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
  let arcSharpnessCurrent = 2.0;    // 곡률
  let arcStartHeight = floorY;

  let lastState: GameRenderState | null = null;
  let lastBallX = 0;
  let currentDir: 1 | -1 = 1;

  // Rally parabola (포물선)
  let segStartX = LOGIC_X_MIN;
  let segEndX = LOGIC_X_MAX;
  
  // Rule: Must be located in opponent's court
  const BOUNCE_RATIO = 0.55;					// 바운스 위치
  let BOUNCE_PEAK = tableDepthWorld * 0.015;	// 바운스 튀는 높이

  function setupArcSegment(bx: number, dir: 1 | -1, startHeight: number) {
	currentDir = dir;
	segStartX = bx;
	segEndX = dir === 1 ? LOGIC_X_MAX : LOGIC_X_MIN;

	// 아크 최대 높이와 곡률을 구간마다 랜덤으로 바꿔서 패턴 반복 방지
	const ratio =
		BASE_ARC_HEIGHT_RATIO +
		(Math.random() - 0.5) * BASE_ARC_RANDOM_RANGE;
	arcMaxHeightCurrent = tableDepthWorld * Math.max(ratio, 0.01);
	arcSharpnessCurrent = 1.1 + Math.random() * 0.9;

	arcStartHeight = startHeight;
  }

  // Load GLB Models (test.glb)
  BABYLON.SceneLoader.ImportMesh(
    "",
    "/models/",
    "test.glb",
    scene,
    (meshes) => {
      // Test for executing
	  console.log("[Babylon] ✅ test.glb 로드 성공!");
      console.log("[Babylon] 로드된 mesh 목록 ↓");
      meshes.forEach((m, i) => {
		console.log(`${i + 1}. name="${m.name}", position=${m.position.toString()}, scaling=${m.scaling.toString()}`);
	  });

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
	  console.log("[Babylon] all mesh names:", Object.keys(byName));
	  console.log("[Babylon] patch check: no paddleMat on paddles, pls");

      // 1) Table replace from GLB
      if (byName["table"]) {
        court.dispose();
        court = byName["table"];
        court.name = "court";

		court.computeWorldMatrix(true);
		const bbox = court.getBoundingInfo().boundingBox;
  		const tableWidth = bbox.maximum.x - bbox.minimum.x;  // X 방향 폭
  		const tableDepth = bbox.maximum.z - bbox.minimum.z;  // Z 방향 깊이

		// 논리 좌표 전체 범위가 테이블 전체에 딱 매핑되도록 스케일 재계산
		const logicWidth = LOGIC_X_MAX - LOGIC_X_MIN;   // 100
		const logicDepth = LOGIC_Z_MAX - LOGIC_Z_MIN;   // 200

		WORLD_X_SCALE = tableWidth / logicWidth;
		WORLD_Z_SCALE = tableDepth / logicDepth;

		tableWidthWorld = tableWidth;
		tableDepthWorld = tableDepth;

		arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
		BOUNCE_PEAK = tableDepthWorld * 0.015;

		console.log("[Babylon] 🧮 table bbox", { tableWidth, tableDepth });
		console.log("[Babylon] 🔁 WORLD_X_SCALE =", WORLD_X_SCALE, "WORLD_Z_SCALE =", WORLD_Z_SCALE);

		// 새 스케일 기반으로 패들 X 위치 재계산
		leftX = logicToWorldX(LOGIC_X_MIN);
		rightX = logicToWorldX(LOGIC_X_MAX - 1.5);

		leftPaddle.position.x = leftX;
		rightPaddle.position.x = rightX;
      }

      // 2) Stadium from GLB
      if (byName["stadium"]) {
        const stadium = byName["stadium"];
        stadium.name = "stadium";
      }

      // 3) Paddles from GLB
	  const paddleParts = allMeshes.filter((m) =>
		m.name.startsWith("paddle_primitive")
	  );
	 
	  if (paddleParts.length > 0) {
		console.log(
        	"[Babylon] paddle parts found:",
        	paddleParts.map((p) => p.name)
      	);

		// Hide controller box (basic mesh, placehodler)
		leftPaddle.isVisible = false;
		rightPaddle.isVisible = false;
		leftPaddle.isPickable = false;
		rightPaddle.isPickable = false;

		leftPaddle.rotationQuaternion = null;
		rightPaddle.rotationQuaternion = null;

		leftPaddle.position = new BABYLON.Vector3(leftX, paddleThickness, -0.5);
		rightPaddle.position = new BABYLON.Vector3(rightX, paddleThickness, 0.5);

		leftPaddle.rotation.y = 0;
		rightPaddle.rotation.y = Math.PI;

		// Left parts assemble
		paddleParts.forEach((part) => {
        	part.setParent(leftPaddle);
    	});
	  
		// Right clone parts assemble
		paddleParts.forEach((part) => {
			const clone = part.clone(part.name + "_right", rightPaddle);
			if (clone) {
				clone.position = part.position.clone();
				clone.rotationQuaternion = part.rotationQuaternion?.clone() ?? null;
				if (!clone.rotationQuaternion)
					clone.rotation = part.rotation.clone();
				clone.scaling = part.scaling.clone();

				clone.material = part.material;
			}
		});

		console.log("[Babylon] 🚀 GLB paddle parts attached to controllers");

		console.log(
			"[Babylon] scene materials:",
			scene.materials.map((m) => ({
				name: m.name,
				type: m.getClassName(),
				// PBR이면 albedoColor, Standard면 diffuseColor
				color: (m as any).albedoColor || (m as any).diffuseColor || null,
				hasTexture:
				!!(m as any).albedoTexture ||
				!!(m as any).diffuseTexture ||
				!!(m as any).baseTexture,
			}))
		);

		paddleParts.forEach((p) => {
			console.log(
				"[Babylon] paddle mesh",
				p.name,
				"mat=",
				p.material && p.material.name,
				"class=",
				p.material && p.material.getClassName(),
				"color=",
				p.material &&
				((p.material as any).albedoColor ||
					(p.material as any).diffuseColor ||
					null),
				"hasTex=",
				!!(
				p.material &&
				((p.material as any).albedoTexture ||
					(p.material as any).diffuseTexture ||
					(p.material as any).baseTexture)
				)
			);
		});
	  }

      // 4) Ball replace from GLB
      if (byName["ball"]) {
        ball.dispose();
        ball = byName["ball"];
        ball.name = "ballModel";
        ball.position = new BABYLON.Vector3(0, floorY, 0);
      }
    },
    undefined,
    (scene, message, exception) => {
      console.error("[Babylon] Failed to load test.glb:", message, exception);
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

  // Resize
  function onResize() {
    engine.resize();
  }
  window.addEventListener("resize", onResize);

  // Update
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
	3단계: 게임 공간 &. 좌표계 맞추기
	4단계: 기본 메쉬로 패들/공 구현
	5단계: 네트워크 gameState랑 3D 싱크 연결
	6단계: 키입력 & WS 로직 그대로 유지 (단, 피드백 추가)
	7단계: Blender에서 만든 .glb 모델 적용
	8단계: 카메라 / 라이트 / 연출 강화
	9단계: 정리 & 에러/리소스 관리
*/