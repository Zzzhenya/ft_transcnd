import { mountGame } from "../game/mount";

export default function mount(root: HTMLElement, params: { matchId: string }) {
	const cleanup = mountGame(root);
	return () => cleanup();
}