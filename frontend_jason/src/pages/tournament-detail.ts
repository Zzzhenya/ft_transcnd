import { navigate } from "@/app/router";
import { setAlias, setTournamentId, assignMyTournamentMatch, setMyMatchStatus, getState, subscribe } from "@/app/store";

export default function (root: HTMLElement, ctx: { params?: { id?: string } }) {
	const tid = ctx.params?.id ?? "t-unknown";
	setTournamentId(tid);

	const s = getState();
	const alias = s.session.alias;

	root.innerHTML = `
	<section class="py-6 md:py-8 lg:py-10 space-y-6">
		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Tournament ${tid}</h1>

		<div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
			<button id="goGame"
				class="w-full sm:w-auto
						px-4 sm:px-5 lg:px-6
						py-2 sm:py-2.5 lg:py-3
						text-sm sm:text-base lg:text-lg
						rounded bg-gray-800 text-white
						hover:bg-gray-900
						focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
				Go to my game
			</button>

			<p id="statusLine"
				class="text-xs sm:text-sm lg:text-base text-gray-600">
			</p>
		</div>

		<div class="rounded border p-4 space-y-3">
			<h2 class="font-semibold">Alias</h2>
			<form id="aliasForm" class="flex gap-2 items-center">
				<input id="aliasInput" class="border rounded px-3 py-2 w-full sm:w-64" placeholder="Enter alias" value="${alias ?? ""}" />
				<button class="px-3 py-2 rounded bg-indigo-600 text-white">Save</button>
			</form>
			<p class="text-sm text-gray-600">Alias is required to receive your match.</p>
		</div>

		<div class="rounded border p-4 space-y-3">
			<h2 class="font-semibold">My Match</h2>
			<div class="flex flex-wrap gap-2">
				<button id="assignPending" class="px-3 py-2 rounded bg-slate-200">Assign (pending)</button>
				<button id="setReady" class="px-3 py-2 rounded bg-emerald-600 text-white">Set Ready</button>
				<button id="setPlaying" class="px-3 py-2 rounded bg-blue-600 text-white">Set Playing</button>
			</div>
			<p class="text-sm text-gray-600">Use these to simulate a real tournament backend.</p>
		</div>

		<section class="rounded border p-4"><h2 class="font-semibold">BracketView (stub)</h2></section>
		<section class="rounded border p-4"><h2 class="font-semibold">Announcements (stub)</h2></section>

		<p class="mt-4"><a href="/tournaments" class="underline text-blue-600">← Tournaments</a></p>
	</section>`;

	// Status HUD
	// "Go to my game"
	const goBtn = root.querySelector<HTMLButtonElement>("#goGame")!;
	const statusLine = root.querySelector<HTMLElement>("#statusLine")!;
	function renderStatus() {
		const s = getState().myMatch;
		statusLine.textContent = `Status: ${s?.status ?? "none"} (id: ${s?.id ?? "-"})`;
	}

	renderStatus();
	const unsubscribe = subscribe(renderStatus);	// Keep the status in unsubscribe for clear finally.

	goBtn.addEventListener("click", () => {
		const m = getState().myMatch;
		if (!m)
			return alert("No match assigned yet.");
		if (m.status === "ready" || m.status === "playing")
			navigate(`/game/${m.id}`);
		else
			alert(`Match not ready (status=${m.status}).`);
	});

	// Alias gate
	const form = root.querySelector<HTMLFormElement>("#aliasForm")!;
	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const val = (root.querySelector<HTMLInputElement>("#aliasInput")!.value || "").trim();
		setAlias(val);
	});

	// Simulate receiving a match from backend
	const pendingBtn = root.querySelector<HTMLButtonElement>("#assignPending")!;
	pendingBtn.addEventListener("click", () => {
		const fakeMatchId = `tmatch-${Date.now()}`;
		assignMyTournamentMatch(fakeMatchId, "pending"); // guard: not allowed yet
		alert(`Assigned match: ${fakeMatchId} (status=pending)`);
	});

	root.querySelector<HTMLButtonElement>("#setReady")!.addEventListener("click", () => {
		setMyMatchStatus("ready"); // guard will allow /game/:id now
		alert("My match is now READY");
	});

	root.querySelector<HTMLButtonElement>("#setPlaying")!.addEventListener("click", () => {
		setMyMatchStatus("playing");
		alert("My match is now PLAYING");
	});

	return () => {
		unsubscribe();
	}
}