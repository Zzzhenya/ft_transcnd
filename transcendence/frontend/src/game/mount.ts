// Only orchestration.
// MVP: No engine, local only.
import { DefaultConfig, createState, PlayerSide } from "./state";
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

	// Dialog (Next round doesn't use rounting)
	const dialog = createResultDialog(root, {
		lobby: "/lobby",
		next: "#",
	});

	// Next round: Not routing(converting)
	function startNextRound() {
		// Increase round count
		state.round += 1;

		// Reset round score
		state.score.left = 0;
		state.score.right = 0;
		state.roundWinner = null;

		// Rest court, ball and start next service
		resetRound(state, cfg);
		serveBall(state, cfg);
	}

	// Get customEvent (Next-round)
	dialog.el.addEventListener("next-round", (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (state.status === "ended") // If match is already finished, ignore.
			return;
		startNextRound();
		dialog.hide();
	});

	// Listeners
	const detach = input.attach(window);

	// OnScore
	function onScore(scored: PlayerSide) {
		state.score[scored] += 1;

		// If round ends
		if (state.score[scored] >= cfg.winScore) {
			state.roundWinner = scored;
			state.roundWins[scored] += 1;

			// if match ends ex) 2 win first
			if (state.roundWins[scored] >= state.roundsToWin) {
				state.matchWinner = scored;
				state.winner = scored;
				state.status = "ended";
				dialog.show(scored);
				return;
			}
			
			//
			state.status = "ready";
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
		const dt = Math.min(0.033, (t - prev) / 1000);
		prev = t;

		// Available reset regardless of pause
		if (input.state.reset) {
			resetRound(state, cfg);
			serveBall(state, cfg);
			input.state.reset = false;
		}

		// Always apply input (status: ready, playing, ended can work)
		applyInput(state, cfg, input, dt);

		// Update info when playing.
		if (!input.state.pause && state.status === "playing") {
			applyInput(state, cfg, input, dt);

			const scored = stepPhysics(state, cfg, dt);
			if (scored)
				onScore(scored);
		}

		drawFrame(ctx, state, cfg);
	}

	// Start to play game.
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
