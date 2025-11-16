import { getAuth, signOut } from "@/app/auth";
import { navigate } from "@/app/router";

export default function (root: HTMLElement) {
  const user = getAuth();
  if (!user) {
    navigate("/auth?next=/profile");
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
      </div>
    </section>
  `;

  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    navigate("/auth?next=/profile");
  });
}
