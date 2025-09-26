export default function renderNotFound(root: HTMLElement) {
  root.innerHTML = `
    <section class="p-6 flex flex-col items-center justify-center min-h-screen text-center space-y-4">
      <h1 class="text-3xl font-bold">404 - Not Found</h1>
      <p class="text-gray-600">SORRY! Can't find page.</p>
      <a href="/" class="underline text-blue-600 hover:text-blue-800">Go to Lobby</a>
    </section>
  `;
}