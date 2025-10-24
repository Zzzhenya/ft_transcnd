// src/renderers/babylon/lobby-scene.ts
/* IMPORTS */
import * as BABYLON from "@babylonjs/core";
import * as GUI from "@babylonjs/gui";

/* TYPE */
type Options = {
	host: HTMLElement;
	onLocal?: () => void;
	onTournaments?: () => void;
};

/* CONSTANTS */
// 1. Color
const COLOR_YELLOW = BABYLON.Color3.FromHexString("#B58514");
const COLOR_PURPLE = BABYLON.Color3.FromHexString("#5E2DD4");

// 2. Geometry: Ground, Wall, Net, Scripes, Center_line, Ball
const GROUND_W = 8000;
const GROUND_H = 4000;
const WALL_W = 8000;
const WALL_H = 2000;
const NET_W = 6000;
const NET_H = 180;
const NET_Z = -360;
const STRIPE_H = 10;
const CENTER_LINE_W = 35;
const CENTER_LINE_H = 2600;
const BALL_DIAMETER= 130;
const BALL_ARC_LIFT = 50;
const BALL_ARC_STEPS = 80;

/* Helpers */
// 1. Aiming guide line update.
function qBezier(p0: BABYLON.Vector3, p1: BABYLON.Vector3, p2: BABYLON.Vector3, t: number) {
	const u = 1 - t;
	return new BABYLON.Vector3(
		u*u*p0.x + 2*u*t*p1.x + t*t*p2.x,
		u*u*p0.y + 2*u*t*p1.y + t*t*p2.y,
		u*u*p0.z + 2*u*t*p1.z + t*t*p2.z
	);
}

// 2. Create Arc path in scene.
function makeArcPath(from: BABYLON.Vector3, to: BABYLON.Vector3, lift = 380, steps = 48) {
	const mid = from.add(to).scale(0.5);
	const ctrl = new BABYLON.Vector3(mid.x, Math.max(from.y, to.y) + lift, mid.z);
	const path: BABYLON.Vector3[] = [];
	for (let i = 0; i <= steps; i++) path.push(qBezier(from, ctrl, to, i / steps));
	return path;
}

/* Mount */
export function mountLobbyScene({
	host, onLocal, onTournaments
  }: Options) {
	// Canvas
	const canvas = document.createElement("canvas");
	Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
	host.appendChild(canvas);

	// Eigine
	const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

	// Scene
	const scene = new BABYLON.Scene(engine);
	scene.defaultCursor = "default";
	scene.hoverCursor = "pointer";
	scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Out of wall, all white color.
	
	// UI
	const ui = GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui", true, scene);
	ui.renderAtIdealSize = true;
	ui.idealWidth = 1920;

	// Camera
	const cam = new BABYLON.FreeCamera("cam", new BABYLON.Vector3(0, 220, -900), scene);
	cam.setTarget(new BABYLON.Vector3(0, 0, 0));
	cam.fov = 1.5;
	cam.minZ = 0.1;
	cam.maxZ = 10000;
	cam.inputs.clear();					// Mouse, Keyborad, Wheel not working.
	// cam.attachControl(canvas, true);	// Can move with mouse to change the camera view

	// Light
	const hemi = new BABYLON.HemisphericLight(
		"hemi",
		new BABYLON.Vector3(0, 1, 0),
		scene
	);
	hemi.intensity = 0.6;

	// Light for shadow
	const sun = new BABYLON.DirectionalLight(
		"sun",
		new BABYLON.Vector3(0.5, -0.3, 0.1), // Direction of sunshine
		scene
	);
	sun.position = new BABYLON.Vector3(-800, 600, -400);
	sun.intensity = 1;

	// Wall: Material
	const mWall = new BABYLON.StandardMaterial("mWall", scene);
	mWall.diffuseColor = COLOR_YELLOW;
	mWall.emissiveColor = COLOR_YELLOW;
	mWall.specularColor = BABYLON.Color3.Black();

	// Wall: Create wall
	const wall = BABYLON.MeshBuilder.CreatePlane(
		"wall",
		{
			width: WALL_W,
			height: WALL_H,
			sideOrientation: BABYLON.Mesh.DOUBLESIDE
		},
		scene
	);
	wall.material = mWall;
	wall.position = new BABYLON.Vector3(0, WALL_H / 2, 0);
	wall.rotation.y = Math.PI;
	wall.isPickable = false;

	// Floor: Material
	const mFloor = new BABYLON.StandardMaterial("mFloor", scene);
	mFloor.diffuseColor = COLOR_PURPLE;
	mFloor.emissiveColor = BABYLON.Color3.Black();
	mFloor.specularColor = BABYLON.Color3.Black();

	// Floor: Create floor
	const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: GROUND_W, height: GROUND_H }, scene);
	ground.material = mFloor;
	ground.position.set(0, 0, -GROUND_H / 2);
	ground.isPickable = false; // Floor should not be for clicking list.

	// Net: Top/bottom white stripes
	const mNetLine = new BABYLON.StandardMaterial("mNetLine", scene);
	mNetLine.diffuseColor = BABYLON.Color3.White();
	mNetLine.specularColor = BABYLON.Color3.Black();
	mNetLine.emissiveColor = BABYLON.Color3.White();

	const netRoot = new BABYLON.TransformNode("netRoot", scene);
	netRoot.position = new BABYLON.Vector3(0, NET_H / 2, NET_Z);

	const topStripe = BABYLON.MeshBuilder.CreatePlane(
		"netTopStripe",
		{ width: NET_W, height: STRIPE_H, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
		scene
	);
	topStripe.material = mNetLine;
	topStripe.parent = netRoot;
	topStripe.position.y = NET_H / 2 - STRIPE_H / 2;
	topStripe.position.z = -0.05;
	topStripe.isPickable = false;
  
	const bottomStripe = BABYLON.MeshBuilder.CreatePlane(
		"netBottomStripe",
		{ width: NET_W, height: STRIPE_H, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
		scene
	);
	bottomStripe.material = mNetLine;
	bottomStripe.parent = netRoot;
	bottomStripe.position.y = -NET_H / 2 + STRIPE_H / 2;
	bottomStripe.position.z = -0.05;
	bottomStripe.isPickable = false;

	// Net: Grid (between two stripes)
	const gridH = NET_H - STRIPE_H * 2;	// Height between two stripes
	const netBody = BABYLON.MeshBuilder.CreatePlane(
		"netBody",
		{ width: NET_W, height: gridH, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
		scene
	);
	netBody.parent = netRoot;
	netBody.position.y = 0;			// In the middle of two scripes
	netBody.position.z = -0.06;		// A little bit upside from middle while line.
	netBody.receiveShadows = false;
	netBody.isPickable = false;

	// Net: material
	const mNetBody = new BABYLON.StandardMaterial("mNetBody", scene);
	mNetBody.specularColor = BABYLON.Color3.Black();
	mNetBody.backFaceCulling = false;

	const texW = 2048, texH = 512;
	const netTex = new BABYLON.DynamicTexture("netTex", { width: texW, height: texH }, scene, true);
	netTex.hasAlpha = true;

	const ctx = netTex.getContext();
	ctx.clearRect(0, 0, texW, texH);
 
	// Net: Color
	const baseAlpha = 0.1;
	const lineAlpha = 0.6;
	ctx.fillStyle = `rgba(94,45,212,${baseAlpha})`;
	ctx.fillRect(0, 0, texW, texH);

	// Net: Interval of grid
	const worldCell = 15; // Fixable
	const cellX = Math.max(4, Math.round(texW * (worldCell / NET_W)));
	const cellY = Math.max(4, Math.round(texH * (worldCell / gridH)));

	// Net: Thickness of line
	const lineX = Math.max(2, Math.round(cellX * 0.18));
	const lineY = Math.max(2, Math.round(cellY * 0.18));

	// Net: Draw vertical lines
	ctx.fillStyle = `rgba(94,45,212,${lineAlpha})`;
	for (let x = 0; x <= texW; x += cellX) {
		ctx.fillRect(x - Math.floor(lineX / 2), 0, lineX, texH);
	}
	// Net: Draw horizontal lines
	for (let y = 0; y <= texH; y += cellY) {
		ctx.fillRect(0, y - Math.floor(lineY / 2), texW, lineY);
	}

	netTex.update();

	// Net: Texture
	mNetBody.diffuseTexture = netTex;
	(mNetBody.diffuseTexture as BABYLON.Texture).hasAlpha = true;
	mNetBody.opacityTexture = netTex;
	mNetBody.useAlphaFromDiffuseTexture = true;
	mNetBody.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
	mNetBody.emissiveColor = COLOR_PURPLE.scale(0.15);
	netBody.material = mNetBody;
  
	// Paddle: Icon default constructor
	function createPaddle(name: string, color: BABYLON.Color3) {
		const root = new BABYLON.TransformNode(name, scene);

		// Rubber
		const rubber = BABYLON.MeshBuilder.CreateDisc(`${name}_rubber`, {
			radius: 150, tessellation: 96,
		}, scene);
		const mRubber = new BABYLON.StandardMaterial(`${name}_mRubber`, scene);
		mRubber.diffuseColor = color;
		mRubber.emissiveColor = color.scale(0.8);
		mRubber.specularColor = BABYLON.Color3.Black();
		rubber.material = mRubber;
		rubber.parent = root;

		// Handgrip
		const handle = BABYLON.MeshBuilder.CreateBox(`${name}_handle`, {
			width: 50, height: 500, depth: 24
		}, scene);
		const mHandle = new BABYLON.StandardMaterial(`${name}_mHandle`, scene);
		mHandle.diffuseColor = BABYLON.Color3.FromHexString("#8B5E3C");
		mHandle.specularColor = BABYLON.Color3.Black();
		handle.material = mHandle;
		handle.parent = root;
		handle.position.x = 0;
		handle.position.y = -60;

		// Paddles always watch camera directly. 180 angle.
		root.getChildMeshes().forEach(m => m.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL);

		// Setting for Click interaction
		rubber.isPickable = true;
		handle.isPickable = false;

		const hit = BABYLON.MeshBuilder.CreateDisc(`${name}_hit`, { radius: 150, tessellation: 32 }, scene);
		hit.isPickable = true; // To check for hover.
		hit.isVisible = false;
		hit.alwaysSelectAsActiveMesh = true;
		hit.parent = root;
		hit.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
		hit.position.z = 0.01;

		return { root, hit, mRubber, handle, rubber };
  	}

	// Paddles: Create two
	const left = createPaddle("paddleLocal", BABYLON.Color3.FromHexString("#e74c3c"));
	const right = createPaddle("paddleTournaments", BABYLON.Color3.FromHexString("#2ecc71"));

  	// Label: Add "Local, Tournaments" on the center of paddles.
	addGuiLabel("Local", left.rubber, { offsetY: 0 });
	addGuiLabel("Tournaments", right.rubber, { offsetY: 0 });

	// Label: Create position in the middle of screen
	const ICON_Y = NET_H + 250;
	const ICON_Z = -200;
	const ICON_X = 600;

	// Paddles: Place two paddle on the screen.
	function snapHandleToFloor(handle: BABYLON.Mesh, floorY = 0) {
		handle.computeWorldMatrix(true);
		const bb = handle.getBoundingInfo().boundingBox;
		const bottomWorldY = bb.minimumWorld.y;	// Minimum level
		const dy = floorY - bottomWorldY;		// Floor level
		handle.position.y += dy;				// Move grips only, not ground.
	}
	left.root.position = new BABYLON.Vector3(-ICON_X, ICON_Y, ICON_Z);
	right.root.position = new BABYLON.Vector3( ICON_X, ICON_Y, ICON_Z);
	snapHandleToFloor(left.handle, 0);
	snapHandleToFloor(right.handle, 0);

	// Paddles: Diable receiving shadows for paddle parts
	[left.root, right.root].forEach(r => r.getChildMeshes().forEach(m => m.receiveShadows = false));

	// Center_line: Properties
	const lineMat = new BABYLON.StandardMaterial("mLine", scene);
	lineMat.diffuseColor = BABYLON.Color3.White();
	lineMat.emissiveColor = BABYLON.Color3.Black();
	lineMat.specularColor = BABYLON.Color3.Black();
	lineMat.disableLighting = false;

	// Center_line: Create
	const centerLine = BABYLON.MeshBuilder.CreateGround(
		"centerLine",
		{ width: CENTER_LINE_W, height: CENTER_LINE_H },
		scene
	);
	centerLine.position.set(0, 0.2, -CENTER_LINE_H / 2 + 6);
	centerLine.material = lineMat;
	centerLine.isPickable = false;

	// Center_line: Shadow
	centerLine.receiveShadows = true;
	centerLine.renderingGroupId = 0;
	lineMat.zOffset = 0;

	// Ball: Properties
	const mBall = new BABYLON.StandardMaterial("mBall", scene);
	mBall.diffuseColor = BABYLON.Color3.White();
	mBall.emissiveColor = BABYLON.Color3.White();
	mBall.specularColor = BABYLON.Color3.Black();

	// Ball: Create
	const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: BALL_DIAMETER, segments: 32 }, scene);
	ball.position = new BABYLON.Vector3(0, BALL_DIAMETER / 2, -630);
	ball.material = mBall;
	ball.isPickable = true;

	// Ball: Shadow
	const sg = new BABYLON.ShadowGenerator(2048, sun);
	sg.addShadowCaster(ball, true);
	ground.receiveShadows = true;
	sg.usePercentageCloserFiltering = true;
	sg.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
	sg.bias = 0.0006;
	sg.normalBias = 0.35;
	(sg as any).darkness = 0.25; // Intensity of shadow

	// Aim line: Properties
	const aimMat = new BABYLON.StandardMaterial("mAim", scene);
	aimMat.disableLighting = true;
	aimMat.alpha = 0.45;
	aimMat.emissiveColor = BABYLON.Color3.Red();

	// Aim line: Create
	const aimTube = BABYLON.MeshBuilder.CreateTube("aimTube", {
		path: [ball.position.clone(), ball.position.clone().add(new BABYLON.Vector3(0,1,0))],
		radius: 6, updatable: true
	}, scene);
	aimTube.material = aimMat;
	aimTube.isPickable = false;
	aimTube.visibility = 0;

	// Interaction: Hover, Click, Launch
	let isAiming = false;
	let isFlying = false;
 
	function updateAimPreview() {
    	if (isFlying) return;
    	const isLeftSide = scene.pointerX < (canvas.clientWidth / 2);
    	const targetRoot = isLeftSide ? left.root : right.root;
    	const to = targetRoot.getAbsolutePosition().add(new BABYLON.Vector3(0, 150, 0));
    	const from = ball.position.clone();

    	const path = makeArcPath(from, to, BALL_ARC_LIFT);
    	BABYLON.MeshBuilder.CreateTube("aimTube", { path, instance: aimTube });
		aimMat.emissiveColor = isLeftSide
			? BABYLON.Color3.FromHexString("#e74c3c")
			: BABYLON.Color3.FromHexString("#2ecc71");
	}

	function intersectsBall(hit: BABYLON.AbstractMesh) {
		hit.computeWorldMatrix(true);
		ball.computeWorldMatrix(true);

		const c1 = ball.getAbsolutePosition();
		const c2 = hit.getAbsolutePosition();
		const r1 = ball.getBoundingInfo().boundingSphere.radiusWorld;
		const r2 = hit.getBoundingInfo().boundingSphere.radiusWorld;

		return BABYLON.Vector3.Distance(c1, c2) <= (r1 + r2);
	}

	// Events: Launch ball to paddles, when confilts -> call back function.
	function launchBallTo(
	target: { root: BABYLON.TransformNode; hit: BABYLON.AbstractMesh },
	onHit?: () => void
	) {
		isFlying = true;
		hasHit = false;
		aimTube.visibility = 0;

		if (flightObserver) {
			scene.onBeforeRenderObservable.remove(flightObserver);
			flightObserver = null;
		}

		const to = target.root.getAbsolutePosition().add(new BABYLON.Vector3(0, 150, 0));
		const from = ball.position.clone();

		const path = makeArcPath(from, to, BALL_ARC_LIFT, BALL_ARC_STEPS);
		const anim = new BABYLON.Animation(
			"shoot", "position", 60,
			BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
			BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
		);
		const keys = path.map((p, i) => ({ frame: i, value: p }));
		anim.setKeys(keys);

		const spin = new BABYLON.Animation(
			"spin", "rotation.y", 60,
			BABYLON.Animation.ANIMATIONTYPE_FLOAT,
			BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
		);
		spin.setKeys([{ frame: 0, value: 0 }, { frame: keys.length - 1, value: Math.PI }]);
		ball.animations = [anim, spin];

		// Conflict check during flying.
		flightObserver = scene.onBeforeRenderObservable.add(() => {
			if (!isFlying || hasHit)
				return;
			if (intersectsBall(target.hit)) {
				hasHit = true;
				isFlying = false;
				onHit?.();
			}
		});

		// Param(5): Speed of Animation.
		scene.beginAnimation(ball, 0, keys.length - 1, false, 0.8, () => {
			isFlying = false;
			if (flightObserver) {
				scene.onBeforeRenderObservable.remove(flightObserver);
				flightObserver = null;
			}
		});
	}

	let flightObserver: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
	let hasHit = false;

 	const BASE = new BABYLON.Vector3(1, 1, 1);
	const HOVER = new BABYLON.Vector3(1.08, 1, 1.08);
	const renderingCanvas = engine.getRenderingCanvas()!;

	let leftTarget = BASE.clone();
	let rightTarget = BASE.clone();

	// Event: Tracking pointer.
	scene.onPointerObservable.add((pi) => {
		if (isFlying)
			return ;

		if (pi.type === BABYLON.PointerEventTypes.POINTERMOVE) {
			const m = pi.pickInfo?.pickedMesh || null;

			const onBall = !!m && m.name === "ball";
			if (onBall && !isAiming) { isAiming = true; aimTube.visibility = 1; }
			if (!onBall && isAiming) { isAiming = false; aimTube.visibility = 0; }
			if (isAiming)
				updateAimPreview();

			const isLeftHover  = m?.name === "paddleLocal_rubber" || m?.name === "paddleLocal_hit";
    		const isRightHover = m?.name === "paddleTournaments_rubber" || m?.name === "paddleTournaments_hit";

    		leftTarget  = isLeftHover  ? HOVER : BASE;
    		rightTarget = isRightHover ? HOVER : BASE;

    		renderingCanvas.style.cursor = 
				(onBall || isLeftHover || isRightHover) ? "pointer" : "default";
		}

		if (pi.type === BABYLON.PointerEventTypes.POINTERPICK) {
			const m = pi.pickInfo?.pickedMesh || null;

			if (m?.name === "paddleLocal_rubber")
				launchBallTo(left, onLocal);
    		else if (m?.name === "paddleTournaments_rubber")
				launchBallTo(right, onTournaments);
      	}
	});

	// Helper: GUI label
	function addGuiLabel(text: string, mesh: BABYLON.AbstractMesh, opts?: { offsetX?: number; offsetY?: number }) {
		const rect = new GUI.Rectangle();
		rect.thickness = 0;					// No outline
		rect.background = "transparent";	// No background
		ui.addControl(rect);
		rect.linkWithMesh(mesh);
		rect.linkOffsetX = opts?.offsetX ?? 0;
		rect.linkOffsetY = opts?.offsetY ?? 0;

		const tb = new GUI.TextBlock();
		tb.text = text;
		tb.color = "black";
		tb.fontSize = 22;
		tb.fontWeight = "600";
		rect.addControl(tb);
		return rect;
	}

	// Soft effect, when mouse approachs to paddles.
	scene.registerBeforeRender(() => {
		left.root.scaling  = BABYLON.Vector3.Lerp(left.root.scaling,  leftTarget,  0.2);
		right.root.scaling = BABYLON.Vector3.Lerp(right.root.scaling, rightTarget, 0.2);
	});

	// Rendering: Loop & Resize
	const onResize = () => engine.resize();
	window.addEventListener("resize", onResize);
	engine.setHardwareScalingLevel(1 / (window.devicePixelRatio || 1));
	engine.runRenderLoop(() => scene.render());

	// Cleanup before return.
	return () => {
		window.removeEventListener("resize", onResize);
		engine.stopRenderLoop();
		scene.dispose();
		engine.dispose();
		canvas.remove();
	};
}

export { mountLobbyScene as default };
