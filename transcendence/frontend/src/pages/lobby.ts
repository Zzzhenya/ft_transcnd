// lobby.ts
import { getAuth } from "@/app/auth";
import { navigate } from "@/app/router";
import { getState, subscribe } from "@/app/store";
import { mountLobbyScene } from "@/renderers/babylon/lobby-scene";

export default function (root: HTMLElement) {
  root.innerHTML = `
  <section class="fixed inset-0 overflow-hidden select-none">
    <!-- 3D Background -->
	<div id="bg3d" class="absolute inset-0 z-0"></div>

    <!-- User info (top-right, small) -->
	<div id="userInfo" class="absolute top-3 right-4 z-10 text-xs text-gray-800 bg-yellow-100/70 backdrop-blur-sm rounded px-2 py-1 shadow"></div>

    <!-- Viewport info (bottom-left, tiny) -->
	<div class="absolute bottom-3 left-4 z-10 font-mono text-[10px] text-white/80">
      <span id="viewportInfo"></span>
    </div>
  </section>`;

  // Babylon BG
  const effectsOff = new URLSearchParams(location.search).get("fx") === "off";
  const bgHost = root.querySelector<HTMLElement>("#bg3d")!;

  const unmountBg = effectsOff
  	? () => {}
	: mountLobbyScene({
		host: bgHost,
		onLocal: () => navigate("/local"),
		onTournaments: () => navigate("/tournaments")
	});

  // Viewport info
  const viewportInfo = root.querySelector<HTMLElement>("#viewportInfo")!;
  const renderViewport = () => {
    const w = window.innerWidth;
    const label =
      w < 640 ? "<640 (base)" :
      w < 768 ? "≥640 (sm)" :
      w < 1024 ? "≥768 (md)" :
      w < 1280 ? "≥1024 (lg)" : "≥1280 (xl)";
    viewportInfo.textContent = `Viewport: ${label}`;
  };
  renderViewport();
  window.addEventListener("resize", renderViewport);

  // ---- User info ----
  const userInfo = root.querySelector<HTMLElement>("#userInfo")!;
  function renderUserInfo() {
    const user = getAuth();
    const state = getState();
    if (user) {
      userInfo.innerHTML = `
        <div class="flex items-center gap-1">
          <span class="text-green-600">●</span>
          <span class="font-medium">${user.name}</span>
        </div>`;
    } else if (state.session.alias) {
      userInfo.innerHTML = `
        <div class="flex items-center gap-1">
          <span class="text-blue-600">●</span>
          <span class="font-medium">Guest: ${state.session.alias}</span>
        </div>`;
    } else {
      userInfo.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-gray-400">●</span>
          <a href="/auth" class="text-gray-700 hover:text-gray-900 underline">Sign in</a>
        </div>`;
    }
  }
  renderUserInfo();

  const onAuthChanged = () => { renderUserInfo(); };
  window.addEventListener("auth:changed", onAuthChanged);
  const unsubscribeStore = subscribe(() => renderUserInfo());

  return () => {
    window.removeEventListener("auth:changed", onAuthChanged);
    window.removeEventListener("resize", renderViewport);
    unsubscribeStore();
    unmountBg();
  };
}
