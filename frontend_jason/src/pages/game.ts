export default function (root: HTMLElement) {
	root.innerHTML = `
		<section class="py-6 md:py-8 lg:py-10 space-y-4">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Game</h1>
			
			<!-- Canvas placeholder -->
			<canvas id="gameCanvas" width="800" height="450" class="w-full max-w-full border rounded"></canvas>

			<!-- HUD slots placeholder -->
			<div id="hud" class="grid grid-cols-2 gap-3 text-sm">
				<div class="rounded border p-3">HUD: Score</div>
				<div class="rounded border p-3">HUD: Controls</div>
			</div>
		</section>`;
}