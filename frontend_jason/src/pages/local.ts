export default function (root: HTMLElement) {
  root.innerHTML = `
    <section class="p-6 space-y-4">
      <h2 class="text-2xl font-semibold">Local</h2>
      <p class="text-gray-600">Button for game start</p>
      <button class="px-4 py-2 rounded bg-slate-300 text-slate-700 cursor-not-allowed" aria-disabled="true">
        GameStart (simulate later in phase2)
      </button>
      <p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
    </section>`;
}