/*
	Role
	- When game ends, it shows a Dialog (Backdrop + centered Modal).
	- Provide two actions: go to 'lobby' or 'next round'.
	- 게임 종료 시 화면을 덮을 백드롭 + 2개의 버튼을 만들어 화면 가운데 띄우는 역할.
*/
import type { PlayerSide } from "../game/state";

export type ResultDialog = {
	el: HTMLDivElement; // Dialog container (including backdrop)
	show: (winner: PlayerSide) => void;
	hide: () => void;
	destroy: () => void;
};

/*
	show(winner)로 표시
	hide()로 숨김
	destroy()로 DOM제거
*/
export function createResultDialog(
	root: HTMLElement,
	routes: { lobby: string; next: string }
): ResultDialog {

	// Dialog(= Backdrop + Modal)
	const dialog = document.createElement("div");
	dialog.style.position = "fixed";
	dialog.style.inset = "0";
	dialog.style.display = "none";
	dialog.style.alignItems = "center";
	dialog.style.justifyContent = "center";
	dialog.style.background = "rgba(0,0,0,0.45)"; // Backdrop
	dialog.style.zIndex = "1000";					// ??
	dialog.setAttribute("aria-hidden", "true");		// ??

	// Modal
	const modal = document.createElement("div");
	modal.style.minWidth = "280px";
	modal.style.maxWidth = "90vw";
	modal.style.background = "#111";
	modal.style.color = "#fff";
	modal.style.padding = "20px 16px";
	modal.style.borderRadius = "16px";
	modal.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
	modal.style.textAlign = "center";
	modal.setAttribute("role", "dialog");			// ??
	modal.setAttribute("aria-modal", "true");		// ??
	modal.tabIndex = -1; // Available to focus		// ??

	// Title
	const title = document.createElement("h2");
	const titleId = "result-dialog-title";			// ??
	title.id = titleId;								// ??
	title.style.margin = "0 0 8px";
	title.style.fontSize = "20px";

	// Sub
	const sub = document.createElement("p");
	const subId = "result-dialog-desc";				// ??
	sub.id = subId;									// ??
	sub.style.margin = "0 0 16px";
	sub.style.opacity = "0.8";

	// Link title for accessibility
	modal.setAttribute("aria-labelledby", titleId);	// ??
	modal.setAttribute("aria-describedby", subId);	// ??

	// BtnWrap
	const btnWrap = document.createElement("div");
	btnWrap.style.display = "flex";
	btnWrap.style.gap = "8px";
	btnWrap.style.justifyContent = "center";

	// ToLobby
	const toLobby = document.createElement("a");
	toLobby.href = routes.lobby;
	toLobby.textContent = "Exit (Lobby)";
	toLobby.style.padding = "10px 14px";
	toLobby.style.borderRadius = "10px";
	toLobby.style.background = "#fafafa";
	toLobby.style.color = "#111";
	toLobby.style.textDecoration = "none";
	toLobby.style.fontWeight = "600";

	// Next round
	const nextRound = document.createElement("button");
	nextRound.type = "button";
	nextRound.textContent = "Next round";
	nextRound.style.padding = "10px 14px";
	nextRound.style.border = "1px solid #fff";
	nextRound.style.borderRadius = "10px";
	nextRound.style.textDecoration = "none";
	nextRound.style.color = "#fff";
	nextRound.style.fontWeight = "600";

	// Append 'Modal' to 'Dialog'
	btnWrap.appendChild(toLobby);
	btnWrap.appendChild(nextRound);
	modal.appendChild(title);
	modal.appendChild(sub);
	modal.appendChild(btnWrap);
	dialog.appendChild(modal);
	root.appendChild(dialog);

	let lastFocused: HTMLElement | null = null;

	// Option: close when click backdrop.			// ??
	const onBackdropClick = (e: MouseEvent) => {
		if (e.target === dialog)
			api.hide();
	};

	// Close with ESC button						// ??
	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Escape")
			api.hide();
	};

	// When user next round clicks, customEvent is executed.
	nextRound.addEventListener("click", (e) => {
		e.preventDefault();
		e.stopPropagation();
		dialog.dispatchEvent(new CustomEvent("next-round"));
	});	

  const api: ResultDialog = {
	el: dialog,

	show(winner) {
		title.textContent = `WIN: ${winner.toUpperCase()}`;
		sub.textContent = "Game ended";
		dialog.style.display = "flex";
		dialog.setAttribute("aria-hidden", "false");
		lastFocused = (document.activeElement as HTMLElement) ?? null;

		// Move initial focus inside the dialog after it's painted		// ??
		requestAnimationFrame(() => {
		(toLobby as HTMLElement).focus();
		});

		// Bind event.													// ??
		dialog.addEventListener("click", onBackdropClick);
		document.addEventListener("keydown", onKeyDown);
	},
    
	hide() {
		dialog.style.display = "none";
		dialog.setAttribute("aria-hidden", "true");

		// Remove event.
		dialog.removeEventListener("click", onBackdropClick);
		document.removeEventListener("keydown", onKeyDown);

		// Restore focus.
		lastFocused?.focus?.();
    },

	destroy() {
		this.hide();
		root.removeChild(dialog);
    },
  };

  return api;
}
