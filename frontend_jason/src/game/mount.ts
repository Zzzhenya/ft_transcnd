// Only orchestration.
// MVP: No engine, local only.
import { DefaultConfig, createState } from "./state";
import { serveBall, resetRound } from "./logic";
import { createInput } from "./input";
import { drawFrame } from "../renderers/draw";
import { applyInput, stepPhysics } from "./update";
import { createResultDialog } from "../ui/resultDialog";

export function mountGame(root: HTMLElement) {
	const cfg = DefaultConfig;
	const state = createState(cfg);
	const input = createInput();

	// Canvas
	const canvas = document.createElement("canvas");
	canvas.width = cfg.court.width;
	canvas.height = cfg.court.height;
	root.appendChild(canvas);
	const ctx = canvas.getContext("2d")!;

	// Dialog
	const dialog = createResultDialog(root, {
		lobby: "/lobby",
		next: "/tournament/next",
	});

	// Listeners
	const detach = input.attach(window);

	// OnScore
	function onScore(scored: "left" | "right") {
		state.score[scored] += 1;

		if (state.score[scored] >= cfg.winScore) {
			state.status = "ended";
			state.winner = scored;
			dialog.show(scored);
			return;
		}

		const nextTo = scored === "left" ? "right" : "left"; // 실점한 쪽이 다음 서브 받기
		resetRound(state, cfg);
		serveBall(state, cfg, nextTo);
	}

	// Loop
	let raf = 0, prev = performance.now();

	function frame(t: number) {
		raf = requestAnimationFrame(frame);
		const dt = Math.min(0.033, (t - prev) / 1000); // ??
		prev = t;

		// Available reset regardless of pause
		if (input.state.reset) {
			resetRound(state, cfg);
			serveBall(state, cfg);
			input.state.reset = false;
		}

		if (!input.state.pause && state.status === "playing") {
			applyInput(state, cfg, input, dt);

			const scored = stepPhysics(state, cfg, dt);
			if (scored)
				onScore(scored);
		}
		drawFrame(ctx, state, cfg);
	}

	// start
	resetRound(state, cfg);
	serveBall(state, cfg);
	requestAnimationFrame((t)=>{ prev=t; frame(t); });

	// unmount
	return () => {
		cancelAnimationFrame(raf);
		detach();
		dialog.destroy();
		root.removeChild(canvas);
	};
}
