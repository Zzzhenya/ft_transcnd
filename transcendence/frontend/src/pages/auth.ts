import { signIn, signOut, getAuth } from "@/app/auth";
import { navigate } from "@/app/router";

export default function (root: HTMLElement, ctx: { url: URL }) {
  const next = ctx.url.searchParams.get("next") || "/profile";
  const user = getAuth();

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Sign in (Mock)</h1>

      <div class="rounded border p-4 space-y-3">
        ${user ? `
          <p class="text-gray-700">Signed in as <strong>${user.name}</strong></p>
          <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
        ` : `
          <form id="form" class="flex gap-2 items-center">
            <input id="name" class="border rounded px-3 py-2 w-full sm:w-64" placeholder="Your name" />
            <button class="px-3 py-2 rounded bg-indigo-600 text-white">Sign in</button>
          </form>
          <p class="text-sm text-gray-600">Mock only. No server call.</p>
        `}
      </div>

      <p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
    </section>
  `;

  root.querySelector<HTMLFormElement>("#form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = (root.querySelector<HTMLInputElement>("#name")?.value || "").trim();
    if (!name) return alert("Enter a name");
    await signIn(name);
    navigate(next);
  });

  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    navigate(`/auth?next=${encodeURIComponent(next)}`);
  });
}
