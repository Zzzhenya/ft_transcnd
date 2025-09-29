// export default function (root: HTMLElement) {
// 	root.innerHTML = `
// 		<section class="py-6 md:py-8 lg:py-10 space-y-6">
// 			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Lobby</h1>
// 			<nav class="flex flex-col sm:flex-row gap-2 sm:gap-3">
// 				<a href="/local" class="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white text-center">Local</a>
// 				<a href="/tournaments" class="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white text-center">Tournaments</a>
// 			</nav>
// 		</section>`;
// }

export default function (root: HTMLElement) {
	root.innerHTML = `
	<section class="py-6 md:py-8 lg:py-10 space-y-8">

		<!-- Viewport -->
		<div class="font-mono text-xs space-x-2">
			<span class="inline sm:hidden px-2 py-1 rounded bg-slate-200">Viewport: &lt;640 (base)</span>
			<span class="hidden sm:inline md:hidden px-2 py-1 rounded bg-slate-200">Viewport: ≥640 (sm)</span>
			<span class="hidden md:inline lg:hidden px-2 py-1 rounded bg-slate-200">Viewport: ≥768 (md)</span>
			<span class="hidden lg:inline xl:hidden px-2 py-1 rounded bg-slate-200">Viewport: ≥1024 (lg)</span>
			<span class="hidden xl:inline px-2 py-1 rounded bg-slate-200">Viewport: ≥1280 (xl)</span>
		</div>

		<!-- Typo size -->
		<header class="space-y-2">
			<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Lobby</h1>
			<p class="text-sm sm:text-base md:text-lg text-gray-600">
				Resize to see changes at <span class="font-mono">sm(640)</span>, <span class="font-mono">md(768)</span>, <span class="font-mono">lg(1024)</span>.
			</p>
		</header>

		<!-- Nav: width, interval, and button's width -->
		<nav class="flex flex-col sm:flex-row gap-2 sm:gap-4 md:gap-6">
			<a href="/local" class="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white text-center">Local</a>
			<a href="/tournaments" class="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white text-center">Tournaments</a>
			<a href="/init" class="w-full sm:w-auto px-4 py-2 rounded bg-emerald-600 text-white text-center">Init</a>
		</nav>

		<!-- Color demo: yellow -> green -> blue -->
		<section aria-label="Color demo" class="space-y-2">
			<h2 class="text-lg font-semibold">Color demo</h2>
			<div class="h-12 rounded flex items-center justify-center font-mono text-xs
					bg-rose-200 sm:bg-amber-200 md:bg-emerald-200 lg:bg-sky-200">
				<span class="inline sm:hidden">&lt;640: bg-rose-200</span>
				<span class="hidden sm:inline md:hidden">≥640: bg-amber-200</span>
				<span class="hidden md:inline lg:hidden">≥768: bg-emerald-200</span>
				<span class="hidden lg:inline">≥1024: bg-sky-200</span>
			</div>
		</section>

		<!-- Padding demo: p-4 → sm:p-6 → md:p-8 → lg:p-10 -->
		<section aria-label="Padding demo" class="space-y-2">
			<h2 class="text-lg font-semibold">Padding demo</h2>
			<div class="rounded border p-4 sm:p-6 md:p-8 lg:p-10">
				<p class="text-sm text-gray-600 font-mono">Padding: p-4 → sm:p-6 → md:p-8 → lg:p-10</p>
			</div>
		</section>

		<!-- Grid demo: 1 → 2 → 3, increase gap -->
		<section aria-label="Grid demo" class="space-y-2">
			<h2 class="text-lg font-semibold">Grid demo</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
				<div class="rounded border p-3">Item 1</div>
				<div class="rounded border p-3">Item 2</div>
				<div class="rounded border p-3 hidden lg:block">Item 3 (lg+)</div>
			</div>
		</section>

    </section>`;
}