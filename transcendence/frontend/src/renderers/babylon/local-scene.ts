// frontend/src/renderers/babylon/local-scene.ts
import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
const modelUrl = new URL("../../assets/test.glb", import.meta.url).href;

type Callbacks = {
	wsUrl: string;
	onStatus?: (msg: string) => void;
	onScore?: (p1: number, p2: number) => void;
	onGameOver?: (winner: "Player 1" | "Player 2") => void;
};

export function startLocalScene(
  canvas: HTMLCanvasElement,
  cb: Callbacks
) {
  // ---------- Engine/Scene ----------
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0, 0, 0).toColor4(1);

  // ---------- Camera ----------
  const camera = new BABYLON.ArcRotateCamera(
    "cam",
    Math.PI * 0.5,
    Math.PI * 0.35,
    18,
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  camera.detachControl(); // Can't move camera
  // camera.attachControl(canvas, true);

	// Set the camera position
	function frameArena(camera: BABYLON.ArcRotateCamera, opts: {
		boundsX: number;   // 좌/우 득점 경계(절반 폭)
		boundsZ: number;   // 상/하 반사 경계(절반 깊이)
		yBase: number;     // 바닥 위 기준 높이
	}) {
		const span = Math.max(opts.boundsX, opts.boundsZ);

		// 보기 좋은 각도(좌우 90도, 위쪽에서 약간 내려다보기)
		camera.alpha = Math.PI * 0.5;     // 정면
		camera.beta  = Math.PI * 0.42;    // 살짝 내려다보기(≈ 75도)

		// 타깃을 경기장 중앙으로
		camera.setTarget(new BABYLON.Vector3(0, opts.yBase + 0.6, 0));

		// 화면에 더 ‘크게’ 보이도록 반지름(거리)과 FOV 조절
		camera.fov = BABYLON.Tools.ToRadians(35);     // 기본보다 좁혀서 더 크게 보이게
		camera.radius = Math.max(6, span * 1.15);     // 너무 멀면 줄이고, 너무 가까우면 늘림

		// 사용자가 못 움직이게 완전 고정
		camera.lowerRadiusLimit = camera.radius;
		camera.upperRadiusLimit = camera.radius;
		camera.lowerAlphaLimit  = camera.alpha;
		camera.upperAlphaLimit  = camera.alpha;
		camera.lowerBetaLimit   = camera.beta;
		camera.upperBetaLimit   = camera.beta;
	}

  // ---------- Lights ----------
  new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
  const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
  dir.position = new BABYLON.Vector3(5, 10, 5);
  const shadow = new BABYLON.ShadowGenerator(2048, dir);
  shadow.useExponentialShadowMap = true;

  // ---------- Game State ----------
  const key = { w: false, s: false, up: false, down: false };

  const gameState = {
    paddles: { leftZ: 0, rightZ: 0 },
    score: { p1: 0, p2: 0 },
    playing: false,
  };

  // 좌/우 경계값 (glb가 로드되면 실제 크기 기준으로 보정)
  let boundsX = 8; // 좌우 득점 경계
  let boundsZ = 5; // 위/아래 반사 경계
  const paddleSpeed = 8; // units/sec
  const ballBaseSpeed = 6; // units/sec

  // ---------- Scene Objects ----------
  let ball: BABYLON.Mesh | null = null;
  let leftPaddle: BABYLON.Mesh | null = null;
  let rightPaddle: BABYLON.Mesh | null = null;

  const load = async () => {
    await BABYLON.SceneLoader.AppendAsync("", modelUrl, scene);

    // ball
    ball = (scene.getMeshByName("ball") as BABYLON.Mesh)
		|| BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.6 }, scene);

    // paddles
    const paddleMeshes = scene.meshes.filter((m) =>
      /paddle/i.test(m.name)
    ) as BABYLON.Mesh[];

    if (paddleMeshes.length >= 2) {
      paddleMeshes.sort((a, b) => a.position.x - b.position.x);

      leftPaddle = paddleMeshes[0]! as BABYLON.Mesh;
      rightPaddle = paddleMeshes[paddleMeshes.length - 1]! as BABYLON.Mesh;
    }
	else {
      // 못 찾으면 임시 박스로 생성
      leftPaddle = BABYLON.MeshBuilder.CreateBox("paddleLeft", { width: 0.6, height: 1.2, depth: 0.2 }, scene);
      rightPaddle = leftPaddle!.clone("paddleRight") as BABYLON.Mesh;
      leftPaddle.position.x = -9;
      rightPaddle.position.x = 9;
    }

    // 그림자 대상
	const casters = [ball, leftPaddle, rightPaddle].filter(Boolean) as BABYLON.Mesh[];
	casters.forEach(m => {
		m.receiveShadows = true;
		shadow.addShadowCaster(m);
	});

    // 바닥이 있다면 경계값을 그 크기에 맞춰보정 (없으면 기본값 유지)
    const floor =
      scene.getMeshByName("floor") ||
      scene.meshes.find((m) => /floor|ground/i.test(m.name));

	// Set tBase basic
	let yBase = 0.6;

    if (floor) {
      const bb = floor.getBoundingInfo().boundingBox;
      boundsX = Math.max(boundsX, Math.floor(bb.maximumWorld.x) - 1);
      boundsZ = Math.max(boundsZ, Math.floor(bb.maximumWorld.z) - 1);
	  yBase = bb.maximumWorld.y + 0.05;
    }
	frameArena(camera, { boundsX, boundsZ, yBase });
    resetPositions();
  };

  // ---------- Game Loop ----------
  let lastT = performance.now();
  let vx = Math.random() > 0.5 ? ballBaseSpeed : -ballBaseSpeed;
  let vz = (Math.random() - 0.5) * ballBaseSpeed;

  function resetPositions() {
    // paddles
    if (leftPaddle) {
      leftPaddle.position = new BABYLON.Vector3(-boundsX + 1, leftPaddle.position.y || 0.6, gameState.paddles.leftZ);
    }
    if (rightPaddle) {
      rightPaddle.position = new BABYLON.Vector3(boundsX - 1, rightPaddle.position.y || 0.6, gameState.paddles.rightZ);
    }
    // ball
    if (ball) {
      ball.position = new BABYLON.Vector3(0, 0.6, 0);
      vx = (Math.random() > 0.5 ? 1 : -1) * ballBaseSpeed;
      vz = (Math.random() - 0.5) * ballBaseSpeed;
      // Ani: little pong
      BABYLON.Animation.CreateAndStartAnimation(
        "bob",
        ball,
        "position.y",
        60,
        60,
        0.6,
        0.9,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE
      );
    }
  }

  function start() {
    if (gameState.playing) return;
    gameState.playing = true;
    cb.onStatus?.("🏓 3D Pong: PLAYING");
  }

  function restart() {
    gameState.score.p1 = 0;
    gameState.score.p2 = 0;
    cb.onScore?.(0, 0);
    resetPositions();
    start();
  }

  function end(winner: "Player 1" | "Player 2") {
    gameState.playing = false;
    cb.onStatus?.(`🏆 Game Over — ${winner} wins!`);
    cb.onGameOver?.(winner);
  }

  // Keyboad
  const keydown = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "W") key.w = true;
    if (e.key === "s" || e.key === "S") key.s = true;
    if (e.key === "ArrowUp") key.up = true;
    if (e.key === "ArrowDown") key.down = true;
  };
  const keyup = (e: KeyboardEvent) => {
    if (e.key === "w" || e.key === "W") key.w = false;
    if (e.key === "s" || e.key === "S") key.s = false;
    if (e.key === "ArrowUp") key.up = false;
    if (e.key === "ArrowDown") key.down = false;
  };
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);

  // per-frame update
  scene.onBeforeRenderObservable.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000); // sec
    lastT = now;

    if (!gameState.playing || !ball || !leftPaddle || !rightPaddle) return;

    // paddles 이동 (Z축 상하)
    if (key.w) gameState.paddles.leftZ = Math.max(-boundsZ + 0.8, gameState.paddles.leftZ - paddleSpeed * dt);
    if (key.s) gameState.paddles.leftZ = Math.min(boundsZ - 0.8, gameState.paddles.leftZ + paddleSpeed * dt);
    if (key.up) gameState.paddles.rightZ = Math.max(-boundsZ + 0.8, gameState.paddles.rightZ - paddleSpeed * dt);
    if (key.down) gameState.paddles.rightZ = Math.min(boundsZ - 0.8, gameState.paddles.rightZ + paddleSpeed * dt);
    leftPaddle.position.z = gameState.paddles.leftZ;
    rightPaddle.position.z = gameState.paddles.rightZ;

    // ball 이동 (XY는 고정, X/Z만 사용)
    ball.position.x += vx * dt;
    ball.position.z += vz * dt;

    // 위/아래 벽 반사 (Z 경계)
    if (ball.position.z > boundsZ || ball.position.z < -boundsZ) {
      vz = -vz;
      ball.position.z = Math.max(-boundsZ, Math.min(boundsZ, ball.position.z));
    }

    // 패들 충돌
    const paddleHalfH = 1.0; // 패들 높이 절반(대략) — 필요하면 블렌더 값에 맞춰 조절
    // 왼쪽
    if (
      ball.position.x <= leftPaddle.position.x + 0.4 &&
      ball.position.x >= leftPaddle.position.x - 0.4 &&
      Math.abs(ball.position.z - leftPaddle.position.z) <= paddleHalfH &&
      vx < 0
    ) {
      vx = Math.abs(vx) * 1.05; // 속도 소폭 증가
      const offset = (ball.position.z - leftPaddle.position.z) / paddleHalfH;
      vz += offset * 2; // 히트 위치에 따른 스핀
    }
    // 오른쪽
    if (
      ball.position.x >= rightPaddle.position.x - 0.4 &&
      ball.position.x <= rightPaddle.position.x + 0.4 &&
      Math.abs(ball.position.z - rightPaddle.position.z) <= paddleHalfH &&
      vx > 0
    ) {
      vx = -Math.abs(vx) * 1.05;
      const offset = (ball.position.z - rightPaddle.position.z) / paddleHalfH;
      vz += offset * 2;
    }

    // 속도 제한
    const maxV = 14;
    vx = Math.max(-maxV, Math.min(maxV, vx));
    vz = Math.max(-maxV, Math.min(maxV, vz));

    // 득점 처리 (X 경계)
    if (ball.position.x > boundsX + 0.5) {
      gameState.score.p1++;
      cb.onScore?.(gameState.score.p1, gameState.score.p2);
      resetPositions();
    } else if (ball.position.x < -boundsX - 0.5) {
      gameState.score.p2++;
      cb.onScore?.(gameState.score.p1, gameState.score.p2);
      resetPositions();
    }

    if (gameState.score.p1 >= 5 || gameState.score.p2 >= 5) {
      end(gameState.score.p1 >= 5 ? "Player 1" : "Player 2");
    }
  });

  // 엔진 루프
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());

  // 모델 로드 시작
  load().then(() => {
    cb.onStatus?.("✅ Model loaded. Press Start.");
  });

  // 외부(페이지)에서 쓰는 컨트롤(2D UI 그대로 연결 가능)
  return {
    start,
    restart,
    dispose() {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}

/* IMPORTS */
// import * as BABYLON from "@babylonjs/core";
// import "@babylonjs/loaders/glTF";
// const modelUrl = new URL("../../assets/test.glb", import.meta.url).href;

// type Callbacks = {
//   wsUrl: string;
//   onStatus?: (msg: string) => void;
//   onScore?: (p1: number, p2: number) => void;
//   onGameOver?: (winner: "player1" | "player2") => void;
//   onOpen?: () => void;
// };

// export function startLocalScene(canvas: HTMLCanvasElement, cb: Callbacks) {
//   // --- Engine/Scene/Camera/Lights ---
//   const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
//   const scene = new BABYLON.Scene(engine);
//   scene.clearColor = new BABYLON.Color3(0, 0, 0).toColor4(1);

//   const camera = new BABYLON.ArcRotateCamera("cam", Math.PI * 0.5, Math.PI * 0.42, 14, new BABYLON.Vector3(0, 0.6, 0), scene);
//   camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;
//   camera.lowerAlphaLimit = camera.upperAlphaLimit = camera.alpha;
//   camera.lowerBetaLimit = camera.upperBetaLimit = camera.beta;

//   new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), scene);
//   const dir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(-1, -2, -1), scene);
//   dir.position = new BABYLON.Vector3(5, 10, 5);
//   const shadow = new BABYLON.ShadowGenerator(2048, dir);
//   shadow.useExponentialShadowMap = true;

//   // --- Scene Objects ---
//   let ball: BABYLON.Mesh | null = null;
//   let leftPaddle: BABYLON.Mesh | null = null;
//   let rightPaddle: BABYLON.Mesh | null = null;

//   // 서버 상태(Target) & 렌더 상태(Current)
//   const target = {
//     ball: { x: 0, z: 0 },
//     p1Z: 0,
//     p2Z: 0,
//     score: { player1: 0, player2: 0 },
//     bounds: { x: 9, z: 5 },
//     status: 'waiting' as string
//   };

//   // --- Input ---
//   const key = { w: false, s: false, up: false, down: false };

//   const keydown = (e: KeyboardEvent) => {
//     if (e.key === "w" || e.key === "W") { key.w = true; sendMove('player1', 'up'); }
//     if (e.key === "s" || e.key === "S") { key.s = true; sendMove('player1', 'down'); }
//     if (e.key === "ArrowUp")             { key.up = true; sendMove('player2', 'up'); }
//     if (e.key === "ArrowDown")           { key.down = true; sendMove('player2', 'down'); }
//   };
//   const keyup = (e: KeyboardEvent) => {
//     if (e.key === "w" || e.key === "W") key.w = false;
//     if (e.key === "s" || e.key === "S") key.s = false;
//     if (e.key === "ArrowUp")            key.up = false;
//     if (e.key === "ArrowDown")          key.down = false;
//   };
//   document.addEventListener("keydown", keydown);
//   document.addEventListener("keyup", keyup);

//   // --- WS ---
//   let ws: WebSocket | null = null;
//   let isOpen = false;
//   const pending: any[] = [];

//   function _rawSend(obj: any) {
//     ws!.send(JSON.stringify(obj));
//   }

//   function send(obj: any) {
//     if (ws && isOpen)
// 		_rawSend(obj);
// 	else
// 		pending.push(obj);
//   }

//   function sendMove(player: 'player1'|'player2', direction: 'up'|'down') {
//     send({ type: 'MOVE_PADDLE', player, direction });
//   }

//   function connect() {
//     cb.onStatus?.('🔌 Connecting WebSocket...');
//     ws = new WebSocket(cb.wsUrl);

//     ws.onopen = () => {
// 	  isOpen = true;
//       cb.onStatus?.('✅ Connected. Press Start.');

// 	  while (pending.length)
// 		_rawSend(pending.shift());
// 	  cb.onOpen?.();
//     };
//     ws.onmessage = (ev) => {
//       try {
//         const msg = JSON.parse(ev.data);
//         if (msg.type === 'STATE_UPDATE' && msg.gameState) {
//           const gs = msg.gameState;
//           target.ball.x = gs.ball.x;
//           target.ball.z = gs.ball.z;
//           target.p1Z = gs.paddles.player1Z;
//           target.p2Z = gs.paddles.player2Z;
//           target.bounds = gs.bounds;
//           target.status = gs.tournament?.gameStatus ?? 'waiting';

//           // 점수/게임오버 콜백
//           if (cb.onScore) cb.onScore(gs.score.player1, gs.score.player2);
//           if (target.status === 'gameEnd' && cb.onGameOver) {
//             const winner = gs.tournament?.winner ?? 'player1';
//             cb.onGameOver(winner);
//           }
//         }
//       } catch {}
//     };
//     ws.onclose = () => cb.onStatus?.('🔌 Disconnected.');
//     ws.onerror = () => cb.onStatus?.('❌ WS error.');
//   }

//   // --- Load model ---
//   const load = async () => {
//     await BABYLON.SceneLoader.AppendAsync("", modelUrl, scene);

//     // ball
//     ball = (scene.getMeshByName("ball") as BABYLON.Mesh)
//       || BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.6 }, scene);

//     // paddles (좌/우)
//     const pm = scene.meshes.filter(m => /paddle/i.test(m.name)) as BABYLON.Mesh[];
//     if (pm.length >= 2) {
//       pm.sort((a, b) => a.position.x - b.position.x);
//       leftPaddle = pm[0]!;
//       rightPaddle = pm[pm.length - 1]!;
//     } else {
//       leftPaddle = BABYLON.MeshBuilder.CreateBox("paddleLeft", { width: 0.6, height: 1.2, depth: 0.2 }, scene);
//       rightPaddle = leftPaddle.clone("paddleRight") as BABYLON.Mesh;
//       leftPaddle.position.x = -9;
//       rightPaddle.position.x = 9;
//     }

//     [ball, leftPaddle, rightPaddle].forEach(m => m && shadow.addShadowCaster(m));
//     cb.onStatus?.('✅ Model loaded.');
//   };

//   // --- Frame update (Render only; lerp toward server state) ---
//   const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

//   scene.onBeforeRenderObservable.add(() => {
//     if (!ball || !leftPaddle || !rightPaddle) return;

//     const t = 0.2; // 보간율
//     // X–Z만 반영 (서버 값 → 현재 값)
//     ball.position.x = lerp(ball.position.x, target.ball.x, t);
//     ball.position.z = lerp(ball.position.z, target.ball.z, t);
//     leftPaddle.position.z  = lerp(leftPaddle.position.z,  target.p1Z, t);
//     rightPaddle.position.z = lerp(rightPaddle.position.z, target.p2Z, t);
//   });

//   engine.runRenderLoop(() => scene.render());
//   window.addEventListener("resize", () => engine.resize());

//   load().then(connect);

//   return {
//     send,
//     dispose() {
//       document.removeEventListener("keydown", keydown);
//       document.removeEventListener("keyup", keyup);
//       if (ws && ws.readyState === WebSocket.OPEN) ws.close();
//       engine.stopRenderLoop();
//       scene.dispose();
//       engine.dispose();
//     }
//   };
// }