// src/app/router.ts
// SPA 라우터: URL ↔ 페이지 모듈 매칭, a[href] 인터셉트, popstate 처리, 포커스 이동, 404 처리

type Cleanup = () => void;
type Ctx = { params?: Record<string, string>; url: URL };
type PageModule = { default: (root: HTMLElement, ctx: Ctx) => Cleanup | void };
type Importer = (m: RegExpMatchArray) => Promise<PageModule>;

// 경로 테이블 (정규식 → 해당 페이지 동적 import)
const routes: [RegExp, Importer][] = [
  [/^\/$/,                    () => import("../pages/lobby") as Promise<PageModule>],
  [/^\/init$/,                () => import("../pages/init") as Promise<PageModule>],
  [/^\/local$/,               () => import("../pages/local") as Promise<PageModule>],
  [/^\/tournaments$/,         () => import("../pages/tournaments") as Promise<PageModule>],
  [/^\/tournaments\/([^/]+)$/,() => import("../pages/tournament-detail") as Promise<PageModule>],
  [/^\/game\/([^/]+)$/,       () => import("../pages/game") as Promise<PageModule>],
];

export function initRouter(root: HTMLElement) {
  let cleanup: Cleanup | undefined;

  async function render(path: string) {
    // 이전 페이지 clean-up
    cleanup?.();

    const url = new URL(path, location.origin);
    const pathname = url.pathname;

    // 매칭 라우트 찾기
    const hit = routes.find(([re]) => re.test(pathname));
	if (!hit) {
      const mod = (await import("../pages/not-found")) as PageModule;
      cleanup = mod.default(root, { url }) || undefined;
      postRenderFocus();
      return;
    }

    const [re, importer] = hit;
    const m = pathname.match(re)!;
    const mod = await importer(m);

    // /:id 한 개만 캡처하는 패턴 가정
    const params = m[1] ? { id: m[1] } : undefined;

    // 페이지 렌더 (clean-up 반환 가능)
    cleanup = mod.default(root, { params, url }) || undefined;

    postRenderFocus();
  }

  // 내부 링크 인터셉트 (새탭/중클릭/수정키는 통과)
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;

    const me = e as MouseEvent;
    if (me.defaultPrevented) return;
    if (me.button !== 0 || me.metaKey || me.ctrlKey || me.shiftKey || me.altKey) return;

    const url = new URL(a.href, location.origin);
    if (url.origin !== location.origin) return; // 외부 링크는 통과

    const next = url.pathname + url.search;
    const curr = location.pathname + location.search;
    if (next === curr) { e.preventDefault(); return; }

    e.preventDefault();
    history.pushState({}, "", next);
    render(next);
  });

  // 뒤/앞 이동
  window.addEventListener("popstate", () => {
    render(location.pathname + location.search);
  });

  	// 전환 후 포커스 (a11y)
	function postRenderFocus() {
    	document.getElementById("app")?.focus();
    	// 필요하면 스크롤 정책도 추가
    	// window.scrollTo({ top: 0 });
	}

	return { render };
}

// Programatic navigation
export function navigate(to: string)
{
	const next = to.startsWith("/") ? to : "/" + to; // ← startsWith(✅)
	history.pushState({}, "", next);
	dispatchEvent(new PopStateEvent("popstate"));
}