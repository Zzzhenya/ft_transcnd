export default function (root: HTMLElement) {
	root.innerHTML = `
		<section class="py-6 md:py-8 lg:py-10 space-y-6">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<h2 class="text-xl sm:text-2xl lg:text-3xl font-semibold">Tournaments</h2>

				<a href="/tournaments/demo"
					class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded bg-emerald-600 text-white text-center hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
					Open Demo Tournament
				</a>
			</div>

			<!-- All cards are link -->
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<a href="/tournaments/summer-open"
					class="block rounded border p-4 shadow-sm space-y-2 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
					<h3 class="font-medium text-lg sm:text-xl">Summer Open</h3>
					<p class="text-sm sm:text-base text-gray-500">Classic summer series</p>
					<span class="inline-block mt-2 px-3 py-2 rounded bg-blue-600 text-white">Enter</span>
				</a>

				<a href="/tournaments/autumn-cup"
					class="block rounded border p-4 shadow-sm space-y-2 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
					<h3 class="font-medium text-lg sm:text-xl">Autumn Cup</h3>
					<p class="text-sm sm:text-base text-gray-500">Pre-season warm-up</p>
					<span class="inline-block mt-2 px-3 py-2 rounded bg-indigo-600 text-white">Enter</span>
				</a>

				<a href="/tournaments/demo"
					class="block rounded border p-4 shadow-sm space-y-2 hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
					<h3 class="font-medium text-lg sm:text-xl">Demo Tournament</h3>
					<p class="text-sm sm:text-base text-gray-500">Use this to test AliasGate & Guards</p>
					<span class="inline-block mt-2 px-3 py-2 rounded bg-slate-800 text-white">Enter Demo</span>
				</a>
			</div>
			
			<p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
    	</section>`;
}