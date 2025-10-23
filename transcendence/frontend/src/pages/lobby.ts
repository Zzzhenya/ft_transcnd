import { getAuth, signOut } from "@/app/auth";
import { navigate } from "@/app/router";
import { getState, subscribe } from "@/app/store";

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

		<!-- User info -->
		<div id="userInfo" class="rounded border p-3 bg-gray-50"></div>

		<!-- Typo size -->
		<header class="space-y-2">
			<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Lobby</h1>
			<p class="text-sm sm:text-base md:text-lg text-gray-600">
				Choose your game mode below.
			</p>
		</header>

		<!-- Nav: width, interval, and button's width -->
		<nav class="flex flex-col sm:flex-row gap-2 sm:gap-4 md:gap-6">
			<a href="/local" class="w-full sm:w-auto px-4 py-2 rounded bg-blue-600 text-white text-center">Local</a>
			<a href="/tournaments" class="w-full sm:w-auto px-4 py-2 rounded bg-indigo-600 text-white text-center">Tournaments</a>
			<a href="/init" class="w-full sm:w-auto px-4 py-2 rounded bg-emerald-600 text-white text-center">Init</a>

			<!-- Auth-aware slot -->
      		<span id="authNav" class="w-full sm:w-auto"></span>
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

	// --- User info section ---
	const userInfo = root.querySelector<HTMLElement>("#userInfo")!;

	function renderUserInfo() {
		const user = getAuth();
		const state = getState();
		
		if (user) {
			// Authenticated user
			userInfo.innerHTML = `
				<div class="flex items-center gap-2">
					<span class="text-green-600">●</span>
					<span class="font-medium">Logged in as ${user.name}</span>
					<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Registered</span>
				</div>
			`;
		} else if (state.session.alias) {
			// Guest with alias
			userInfo.innerHTML = `
				<div class="flex items-center gap-2">
					<span class="text-blue-600">●</span>
					<span class="font-medium">Playing as ${state.session.alias}</span>
					<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Guest</span>
				</div>
			`;
		} else {
			// No user, no alias
			userInfo.innerHTML = `
				<div class="flex items-center gap-2">
					<span class="text-gray-400">●</span>
					<span class="text-gray-600">Not signed in</span>
					<a href="/auth" class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Sign in or play as guest</a>
				</div>
			`;
		}
	}

	// --- Auth-aware nav ---
	const authNav = root.querySelector<HTMLElement>("#authNav")!;

	function renderAuthNav() {
		const user = getAuth();
		authNav.innerHTML = user
      		? `
				<div class="flex flex-col sm:flex-row gap-2">
					<a href="/profile"
						class="w-full sm:w-auto px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3
							text-sm sm:text-base rounded bg-slate-800 text-white text-center">
					Profile
					</a>
					<button id="logout"
						class="w-full sm:w-auto px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3
							text-sm sm:text-base rounded bg-slate-600 text-white">
					Sign out
					</button>
				</div>`
			: `
				<a href="/auth?next=/profile"
					class="w-full sm:w-auto px-4 sm:px-5 lg:px-6 py-2 sm:py-2.5 lg:py-3
						text-sm sm:text-base rounded bg-emerald-600 text-white text-center">
					Sign in
				</a>`;

		// Sign out 클릭 처리
		authNav.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async (e) => {
			e.preventDefault();
			await signOut();
			navigate("/auth?next=/profile");
		});
	}

	renderUserInfo();
	renderAuthNav();

	// mock-auth.ts에서 dispatch하는 'auth:changed' 이벤트로 즉시 UI 갱신
	const onAuthChanged = () => {
		renderUserInfo();
		renderAuthNav();
	};
	
	window.addEventListener("auth:changed", onAuthChanged);
	const unsubscribeStore = subscribe(() => renderUserInfo());

	// 라우팅으로 페이지 떠날 때 리스너 해제 (메모리 누수 방지)
	return () => {
		window.removeEventListener("auth:changed", onAuthChanged);
		unsubscribeStore();
	};
}