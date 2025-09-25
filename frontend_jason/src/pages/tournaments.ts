export default function (root: HTMLElement) {
  root.innerHTML = `
    <section class="p-6 space-y-6">
      <h2 class="text-2xl font-semibold">Tournaments</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <article class="rounded border p-4 shadow-sm">
          <h3 class="font-medium">Summer Open</h3>
          <p class="text-sm text-gray-500">Dummy card</p>
        </article>
        <article class="rounded border p-4 shadow-sm">
          <h3 class="font-medium">Autumn Cup</h3>
          <p class="text-sm text-gray-500">Dummy card</p>
        </article>
      </div>
      <p class="mt-4"><a href="/" class="underline text-blue-600">← Lobby</a></p>
    </section>`;
}