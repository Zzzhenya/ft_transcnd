import { navigate } from "@/app/router";
import { getState } from "@/app/store";

export default function (root: HTMLElement) {
	const el = document.createElement("div");
	el.innerHTML = `<p>Redirecting to the next round…</p>`;
	root.appendChild(el);

	const s = getState();
	const tid =
		(s as any)?.tournamentId ??
		(s as any)?.myMatch?.tournamentId ??
		null;

	// Prefer going back to the current tournament detail if known
	const target = tid
		? `/tournaments/${tid}`
		: `/tournaments`;

	// Defer one tick to let the page mount before navigating
	requestAnimationFrame(() => navigate(target));

	return () => root.removeChild(el);
}
