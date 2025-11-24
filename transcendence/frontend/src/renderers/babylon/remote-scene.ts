// frontend/src/renderers/babylon/remote-scene.ts
// COMPLETE FIX: Split-screen perspective view for each player

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

export type RemoteSceneController = {
	update: (state: GameRenderState) => void;
	dispose: () => void;
	setPlayerNumber: (playerNumber: 1 | 2) => void; // Set which player's perspective
	ready: Promise<void>;
};

export function createRemoteScene(canvas: HTMLCanvasElement, playerNumber: 1 | 2 = 1): RemoteSceneController {
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

	// ---------- Single camera for player's perspective ----------
	let currentPlayerNumber = playerNumber;

	// Single camera - will be positioned based on player number
	const camera = new BABYLON.ArcRotateCamera(
		"camera",
		BABYLON.Tools.ToRadians(playerNumber === 1 ? 0 : 180),
		BABYLON.Tools.ToRadians(70),
		18,
		new BABYLON.Vector3(0, 1, 0),
		scene
	);

	camera.inputs.clear();
	camera.inputs.add(new BABYLON.ArcRotateCameraPointersInput());
	camera.attachControl(canvas, true);
	camera.panningSensibility = 0;
	camera.minZ = 0.1;
	camera.maxZ = 1000;
	camera.lowerRadiusLimit = 12;
	camera.upperRadiusLimit = 24;
	camera.fov = 0.35;
	camera.lowerBetaLimit = BABYLON.Tools.ToRadians(60);
	camera.upperBetaLimit = BABYLON.Tools.ToRadians(100);

	scene.activeCamera = camera;

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

	// Coordinate system
	const LOGIC_X_MIN = -50;
	const LOGIC_X_MAX = 50;
	const LOGIC_Z_MIN = -100;
	const LOGIC_Z_MAX = 100;

	let WORLD_X_SCALE = 0.08;
	let WORLD_Z_SCALE = 0.04;

	let tableWidthWorld = (LOGIC_X_MAX - LOGIC_X_MIN) * WORLD_X_SCALE;
	let tableDepthWorld = (LOGIC_Z_MAX - LOGIC_Z_MIN) * WORLD_Z_SCALE;

	let tableCenterX = 0;
	let tableCenterZ = 0;

	let scoreText: GUI.TextBlock | null = null;
	let lastScoreP1 = -1;
	let lastScoreP2 = -1;

	function logicToWorldX(x: number) {
		return tableCenterX + x * WORLD_X_SCALE;
	}

	function logicToWorldZ(z: number) {
		return tableCenterZ + z * WORLD_Z_SCALE;
	}

	function setPlayerNumber(pn: 1 | 2) {
		currentPlayerNumber = pn;
		// Update camera angle based on player number
		camera.alpha = BABYLON.Tools.ToRadians(pn === 1 ? 0 : 180);
		camera.target = new BABYLON.Vector3(tableCenterX, 1, tableCenterZ);
		console.log(`[RemoteScene] Camera set for Player ${pn}`);
	}

	// Court (hidden until 3D model loads)
	const courtWidth = (LOGIC_X_MAX - LOGIC_X_MIN) * WORLD_X_SCALE;
	const courtHeight = (LOGIC_Z_MAX - LOGIC_Z_MIN) * WORLD_Z_SCALE;

	let court: BABYLON.AbstractMesh = BABYLON.MeshBuilder.CreateGround(
		"court",
		{ width: courtWidth, height: courtHeight },
		scene
	);
	const courtMat = new BABYLON.StandardMaterial("courtMat", scene);
	courtMat.diffuseColor = BABYLON.Color3.FromHexString("#5E2DD4");
	courtMat.specularColor = BABYLON.Color3.Black();
	court.material = courtMat;
	court.isVisible = false; // Hide until model loads

	// Center line (hidden until 3D model loads)
	const centerLine = BABYLON.MeshBuilder.CreateBox(
		"centerLine",
		{ width: 0.2, height: 0.02, depth: courtHeight * 0.96 },
		scene
	);
	centerLine.position = new BABYLON.Vector3(0, 0.02, 0);
	const centerMat = new BABYLON.StandardMaterial("centerMat", scene);
	centerMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
	centerMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
	centerLine.material = centerMat;
	centerLine.isVisible = false; // Hide until model loads

	// Paddles (hidden until 3D model loads)
	const paddleThickness = 0.5;
	const paddleHeightWorld = 40 * WORLD_Z_SCALE;

	let leftPaddle: BABYLON.AbstractMesh = BABYLON.MeshBuilder.CreateBox(
		"leftPaddle",
		{ width: 0.4, height: 0.4, depth: paddleHeightWorld },
		scene
	);
	let rightPaddle: BABYLON.AbstractMesh = leftPaddle.clone("rightPaddle", null)!;

	const paddleMat = new BABYLON.StandardMaterial("paddleMat", scene);
	paddleMat.diffuseColor = BABYLON.Color3.FromHexString("#FFFFFF");
	paddleMat.emissiveColor = BABYLON.Color3.FromHexString("#FFFFFF");
	paddleMat.specularColor = BABYLON.Color3.Black();

	let leftX = logicToWorldX(LOGIC_X_MIN);
	let rightX = logicToWorldX(LOGIC_X_MAX - 1.5);

	leftPaddle.position = new BABYLON.Vector3(leftX, paddleThickness, 0);
	rightPaddle.position = new BABYLON.Vector3(rightX, paddleThickness, 0);
	leftPaddle.isVisible = false; // Hide until model loads
	rightPaddle.isVisible = false; // Hide until model loads

	// Ball (hidden until 3D model loads)
	let ball: BABYLON.AbstractMesh = BABYLON.MeshBuilder.CreateSphere(
		"ball",
		{ diameter: 0.5, segments: 16 },
		scene
	);
	const ballMat = new BABYLON.StandardMaterial("ballMat", scene);
	ballMat.diffuseColor = BABYLON.Color3.FromHexString("#FACC15");
	ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
	ballMat.specularColor = BABYLON.Color3.Black();
	ball.material = ballMat;
	ball.isVisible = false; // Hide until model loads

	// Arc configuration - SMOOTHER for remote
	const BALL_FLOOR_OFFSET = -0.6;
	const BASE_ARC_HEIGHT_RATIO = 0.15;  // Lower arc
	const BASE_ARC_RANDOM_RANGE = 0.1;   // Less variation
	const BOUNCE_HEIGHT_RATIO = 0.5;      // Lower bounce

	let arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
	let BOUNCE_PEAK = arcMaxHeightCurrent * BOUNCE_HEIGHT_RATIO;
	let arcSharpnessCurrent = 2.0;  // Sharper arc
	let floorY = 0.1;
	let arcStartHeight = floorY;

	let lastState: GameRenderState | null = null;
	let lastBallX = 0;
	let currentDir: 1 | -1 = 1;

	let segStartX = LOGIC_X_MIN;
	let segEndX = LOGIC_X_MAX;

	function setupArcSegment(bx: number, dir: 1 | -1) {
		currentDir = dir;
		segStartX = bx;
		segEndX = dir === 1 ? LOGIC_X_MAX : LOGIC_X_MIN;

		const ratio = BASE_ARC_HEIGHT_RATIO + (Math.random() - 0.5) * BASE_ARC_RANDOM_RANGE;
		arcMaxHeightCurrent = tableDepthWorld * Math.max(ratio, 0.01);
		arcSharpnessCurrent = 1.8 + Math.random() * 0.4;
		BOUNCE_PEAK = arcMaxHeightCurrent * BOUNCE_HEIGHT_RATIO;
		arcStartHeight = floorY;
	}

	let resolveReady: (() => void) | null = null;
	const ready = new Promise<void>((res) => {
		resolveReady = res;
	});

	// Load GLB Models
	BABYLON.SceneLoader.ImportMesh(
		"",
		"/models/",
		"game3d.glb",
		scene,
		(meshes) => {
			console.log("[RemoteScene] ✅ game3d.glb loaded!");

			const allMeshes: BABYLON.AbstractMesh[] = [];
			meshes.forEach((m) => {
				if (m instanceof BABYLON.AbstractMesh) allMeshes.push(m);
				m.getChildMeshes().forEach((child) => {
					if (child instanceof BABYLON.AbstractMesh) allMeshes.push(child);
				});
			});

			const byName: Record<string, BABYLON.AbstractMesh> = {};
			allMeshes.forEach((m) => {
				if (m.name) byName[m.name] = m;
			});

			// 1) Table
			if (byName["table"]) {
				court.dispose();
				court = byName["table"];
				court.name = "court";

				court.computeWorldMatrix(true);
				const bbox = court.getBoundingInfo().boundingBox;

				const min = bbox.minimumWorld;
				const max = bbox.maximumWorld;
				tableCenterX = (min.x + max.x) / 2;
				tableCenterZ = (min.z + max.z) / 2;
				const extentX = max.x - min.x;
				const extentZ = max.z - min.z;

				const logicWidth = LOGIC_X_MAX - LOGIC_X_MIN;
				const logicDepth = LOGIC_Z_MAX - LOGIC_Z_MIN;
				const SAFE_EPS = 0.0001;

				let worldWidth = Math.abs(extentX) >= Math.abs(extentZ) ? extentX : extentZ;
				let worldDepth = Math.abs(extentX) >= Math.abs(extentZ) ? extentZ : extentX;

				WORLD_X_SCALE = (Math.abs(worldWidth) > SAFE_EPS ? worldWidth : SAFE_EPS) / logicWidth;
				WORLD_Z_SCALE = (Math.abs(worldDepth) > SAFE_EPS ? worldDepth : SAFE_EPS) / logicDepth;

				tableWidthWorld = worldWidth;
				tableDepthWorld = worldDepth;

				const tableTopGuess = max.y;
				floorY = tableTopGuess + BALL_FLOOR_OFFSET;
				arcStartHeight = floorY;
				arcMaxHeightCurrent = tableDepthWorld * BASE_ARC_HEIGHT_RATIO;
				BOUNCE_PEAK = tableDepthWorld * 0.025;

				leftPaddle.position.y = floorY + 0.02;
				rightPaddle.position.y = floorY + 0.02;
				ball.position.y = floorY;

				leftX = logicToWorldX(LOGIC_X_MIN);
				rightX = logicToWorldX(LOGIC_X_MAX - 1.5);
				leftPaddle.position.x = leftX;
				rightPaddle.position.x = rightX;

				leftPaddle.position.z = logicToWorldZ(0);
				rightPaddle.position.z = logicToWorldZ(0);

				// Update camera target
				camera.target = new BABYLON.Vector3(tableCenterX, 1, tableCenterZ);
			}

			// 2) Stadium
			if (byName["stadium"]) {
				const stadium = byName["stadium"] as BABYLON.AbstractMesh;
				stadium.name = "stadium";

				stadium.computeWorldMatrix(true);
				const sBox = stadium.getBoundingInfo().boundingBox;
				const sMin = sBox.minimumWorld;
				const sMax = sBox.maximumWorld;
				const sCenter = sMin.add(sMax).scale(0.5);

				const offset = new BABYLON.Vector3(
					tableCenterX - sCenter.x,
					0,
					tableCenterZ - sCenter.z
				);
				stadium.position.addInPlace(offset);
			}

			// 3) Scoreboard
			const scorePanel = allMeshes.find((m) =>
				(m.name ?? "").toLowerCase().startsWith("scoreboard_")
			);

			if (scorePanel) {
				const uiTex = GUI.AdvancedDynamicTexture.CreateFullscreenUI("scoreUI", true, scene);
				scoreText = new GUI.TextBlock("scoreText", "0 - 0");
				scoreText.color = "#FFE96B";
				scoreText.fontSize = 72;
				scoreText.outlineColor = "black";
				scoreText.outlineWidth = 1;
				uiTex.addControl(scoreText);
				scoreText.linkWithMesh(scorePanel);
				scoreText.linkOffsetY = 0;
			}

			// 4) Paddles
			const leftPaddleParts = allMeshes.filter((m) => {
				const name = (m.name ?? "").toLowerCase();
				return name.includes("l_paddle");
			});

			const rightPaddleParts = allMeshes.filter((m) => {
				const name = (m.name ?? "").toLowerCase();
				return name.includes("r_paddle");
			});

			if (leftPaddleParts.length && rightPaddleParts.length) {
				leftPaddle.dispose();
				rightPaddle.dispose();
				const leftRoot = new BABYLON.TransformNode("leftPaddleRoot", scene);
				const rightRoot = new BABYLON.TransformNode("rightPaddleRoot", scene);
				leftPaddle = leftRoot as unknown as BABYLON.AbstractMesh;
				rightPaddle = rightRoot as unknown as BABYLON.AbstractMesh;

				leftPaddleParts.forEach((m) => m.setParent(leftRoot));
				rightPaddleParts.forEach((m) => m.setParent(rightRoot));

				leftRoot.position = new BABYLON.Vector3(leftX + 1.5, floorY + 0.3, logicToWorldZ(0));
				rightRoot.position = new BABYLON.Vector3(rightX - 1.5, floorY + 0.3, logicToWorldZ(0));
			}

			// 5) Ball
			if (byName["ball"]) {
				ball.dispose();
				ball = byName["ball"];
				ball.name = "ballModel";
				ball.position.x = logicToWorldX(0);
				ball.position.z = logicToWorldZ(0);
				ball.position.y = floorY;
			}

			if (resolveReady) {
				resolveReady();
				resolveReady = null;
			}
		},
		undefined,
		(scene, message, exception) => {
			console.error("[RemoteScene] Failed to load game3d.glb:", message, exception);
			if (resolveReady) {
				resolveReady();
				resolveReady = null;
			}
		}
	);

	// Render loop
	engine.runRenderLoop(() => {
		if (lastState) {
			const bx = lastState.ball.x ?? 0;

			let u = (bx - segStartX) / (segEndX - segStartX || 0.0001);
			if (u < 0) u = 0;
			else if (u > 1) u = 1;

			let h: number;

			if (u <= BOUNCE_HEIGHT_RATIO) {
				const t = u / (BOUNCE_HEIGHT_RATIO || 0.0001);
				const base = Math.pow(4 * t * (1 - t), arcSharpnessCurrent);
				const lerpToFloor = BABYLON.Scalar.Lerp(arcStartHeight, floorY, t);
				h = lerpToFloor + arcMaxHeightCurrent * base;
			} else {
				const v = (u - BOUNCE_HEIGHT_RATIO) / (1 - BOUNCE_HEIGHT_RATIO || 0.0001);
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

		// Ball position
		if (state.ball) {
			let bx = state.ball.x ?? 0;
			let by = state.ball.y ?? 0;

			if (!prev) {
				lastBallX = bx;
				setupArcSegment(bx, bx >= 0 ? -1 : 1);
			}

			let newDir: 1 | -1 = currentDir;
			if (bx > lastBallX + 0.2) newDir = 1;
			else if (bx < lastBallX - 0.2) newDir = -1;

			if (newDir !== currentDir) {
				setupArcSegment(bx, newDir);
			}

			lastBallX = bx;

			ball.position.x = logicToWorldX(bx);
			ball.position.z = logicToWorldZ(by);
		}

		// Game status
		if (state.gameStatus === "gameEnd") {
			ballMat.emissiveColor = new BABYLON.Color3(1, 1, 0.3);
		} else {
			ballMat.emissiveColor = BABYLON.Color3.FromHexString("#FACC15");
		}

		// Score
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

	// Cleanup
	function dispose() {
		window.removeEventListener("resize", onResize);
		scene.dispose();
		engine.dispose();
	}

	// Initial state
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

	return { update, dispose, setPlayerNumber, ready };
}