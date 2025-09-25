export default function (root: HTMLElement) {
  root.innerHTML = `
    <section class="p-6 space-y-6">
      <h1 class="text-3xl font-bold">Lobby</h1>
      <nav class="flex gap-3">
        <a href="/local" class="px-3 py-2 rounded bg-blue-600 text-white">Local</a>
        <a href="/tournaments" class="px-3 py-2 rounded bg-indigo-600 text-white">Tournaments</a>
      </nav>
    </section>`;
}