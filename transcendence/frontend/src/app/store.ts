// Global store (observer pattern) for alias/session, tournament, and myMatch.
export type MatchType = "local" | "tournament";
export type MatchStatus = "pending" | "ready" | "playing" | "finished";

export interface MyMatch {
	id: string;
	type: MatchType;
	status: MatchStatus;
	tournamentId?: string;
}

export interface State {
	session: {
		alias?: string;
		lastLocalMatchId?: string;
	};

	tournament: {
		currentId?: string;
	};

	myMatch?: MyMatch;
}

type Listener = (s: State) => void;

const STORAGE_KEY = "ft_transcendence_version1";

function load(): State | undefined {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as State) : undefined;
	} catch {
		return undefined;
	}
}

function save(s: State) {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
	} catch {}
}

const state: State = load() ?? { session: {}, tournament: {} };

const listeners = new Set<Listener>();

function emit() {
	save(state);
	for (const fn of listeners) fn(state);
}

export function subscribe(fn: Listener) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function getState(): State {
	return state;
}

// --- Session / Alias ---
export function setAlias(alias: string) {
	state.session.alias = alias.trim() || undefined;
	emit();
}

// --- Local match helpers ---
export function startLocalMatch(): string {
	const id = `local-${Date.now()}`;
	state.session.lastLocalMatchId = id;
	state.myMatch = { id, type: "local", status: "ready" };
	emit();
	return id;
}

// --- Tournament helpers (stubs to be used by tournament pages) ---
export function setTournamentId(tournamentId: string) {
	state.tournament.currentId = tournamentId;
	emit();
}

export function assignMyTournamentMatch(matchId: string, status: MatchStatus = "pending") {
	state.myMatch = {
		id: matchId,
		type: "tournament",
		status,
		tournamentId: state.tournament.currentId,
	};
	emit();
}

export function setMyMatchStatus(status: MatchStatus) {
	if (!state.myMatch)
		return;
	state.myMatch.status = status;
	emit();
}

export function clearAlias() {
  localStorage.removeItem("alias");
  emit();
}