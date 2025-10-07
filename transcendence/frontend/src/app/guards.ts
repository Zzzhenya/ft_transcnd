// Route guards for navigation decisions
// ex: No ID ? -> No Game !
import { getState } from "./store";

type GuardResult =
	| { ok: true }
	| { ok: false; redirect: string; reason: string };

export function canEnterGame(matchId: string): GuardResult {
	const s = getState();
	const m = s.myMatch;

	// Local rule: only the last local match created from /local is allowed
	if (matchId.startsWith("local-")) {
		if (s.session.lastLocalMatchId === matchId)
			return { ok: true };
		return { ok: false, redirect: "/local", reason: "invalid-local-match" };
	}

	// Tournament rule: must be the user's assigned match AND status is ready/playing
	if (m?.type === "tournament" && m.id === matchId) {
		if (m.status === "ready" || m.status === "playing")
			return { ok: true };
		return {
			ok: false,
			redirect: `/tournaments/${m.tournamentId ?? ""}`,
			reason: `match-${m.status}`,
		};
	}

	// Unknown match id
	return { ok: false, redirect: "/", reason: "no-match-bound" };
}