// frontend/src/pages/profile.ts
import { getAuth, signOut } from "@/app/auth";
import { navigate } from "@/app/router";

export default function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  // If not logged in, redirect to auth with next param set to current path
  const currentPath = ctx?.url?.pathname || "/profile";
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-4">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Profile</h1>
      <div class="rounded border p-4 space-y-2">
        <p><span class="text-gray-500">Name:</span> <strong>${user.name}</strong></p>
        <p><span class="text-gray-500">UserID:</span> <code class="text-xs">${user.id}</code></p>
      </div>
      <div class="flex gap-2">
        <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
        <a href="/" class="px-3 py-2 rounded bg-blue-600 text-white">Go Lobby</a>
        <button id="backBtn" class="px-3 py-2 rounded bg-gray-400 text-white">Go Back to tournament lobby</button>
      </div>
    </section>
  `;

  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    // After logout, redirect to auth with next param set to current path
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
  });

root.querySelector<HTMLButtonElement>("#backBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  navigate("/tournaments");
});
}