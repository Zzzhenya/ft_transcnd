import { startLocalMatch } from "@/app/store";
import { navigate } from "@/app/router";

export default function (root: HTMLElement) {
	root.innerHTML = `
		<section class="py-6 md:py-8 lg:py-10 space-y-4">
			<h2 class="text-xl sm:text-2xl lg:text-3xl font-semibold">Local</h2>
			<p class="text-gray-600">Button for game start</p>

			<!-- Specific ID + Simulator button -->
			<button id="startLocal"
					class="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
				Start Local Match
			</button>

			<p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
		</section>`;

	// Event
	root.addEventListener("click", (ev) => {
		const btn = (ev.target as HTMLElement).closest("#startLocal") as HTMLButtonElement | null;
		if (!btn)
			return;
		const id = startLocalMatch();	// e.g., local-1727600000000
		navigate(`/game/${id}`);		// Guard will allow only this ID
	});
}