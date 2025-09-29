export default function renderNotFound(root: HTMLElement) {
	root.innerHTML = `
		<section class="py-10 flex flex-col items-center justify-center min-h-screen text-center space-y-4">
			<h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">404 - Not Found</h1>
			<p class="text-gray-600 max-w-prose px-4">SORRY! Can't find page.</p>
			<a href="/" class="underline text-blue-600 hover:text-blue-800">Go to Lobby</a>
		</section>`;
}