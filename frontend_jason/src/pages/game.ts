import { mountGame } from "@/game/mount";

export default function (
	root: HTMLElement,
	ctx: { params?: { matchId?: string }; url?: URL }
) {
	const matchId = ctx.params?.matchId ?? "unknown";

	root.innerHTML = `
		<section class="py-6 md:py-8 lg:py-10 space-y-4">
      		<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
				Game <span class="text-sm font-normal text-gray-500">(id: ${matchId})</span>
			</h1>

			<!-- BEFORE: Canvas placeholder -->
			<!-- <canvas id="gameCanvas" width="800" height="450" class="w-full max-w-full border rounded"></canvas> -->

			<div id="game-root" class="w-full"></div>

			<!-- HUD slots placeholder -->
			<div id="hud" class="grid grid-cols-2 gap-3 text-sm">
				<div class="rounded border p-3">HUD: Score</div>
				<div class="rounded border p-3">HUD: Controls</div>
			</div>
    	</section>`;

  const host = root.querySelector<HTMLDivElement>("#game-root")!;
  const cleanup = mountGame(host); // mount.ts does createCanvas, loop, listner.
  return () => cleanup();
}
