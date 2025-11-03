import { startLocalScene } from "../renderers/babylon/local-scene";

export default function (root: HTMLElement) {
  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-8">
      <header class="space-y-2">
        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">🏓 3D Pong Game</h1>
        <p class="text-sm sm:text-base md:text-lg text-gray-600">
          Two-player local game with real physics and collision detection!
        </p>
      </header>

      <div class="flex gap-4 justify-center">
        <button id="startBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
          Start Game
        </button>
        <button id="restartBtn" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold" disabled>
          Restart Game
        </button>
        <button id="lobbyBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold">
          Back to Lobby
        </button>
      </div>

      <div id="gameStatus" class="text-center text-lg font-medium">
        ⏳ Loading 3D scene...
      </div>

      <div class="flex justify-center">
        <div class="bg-gray-900 p-4 rounded-lg shadow-lg">
          <canvas id="gameCanvas" width="800" height="400" class="border border-gray-700 bg-black"></canvas>
        </div>
      </div>
    </section>
  `;

  const startBtn   = root.querySelector('#startBtn') as HTMLButtonElement;
  const restartBtn = root.querySelector('#restartBtn') as HTMLButtonElement;
  const lobbyBtn   = root.querySelector('#lobbyBtn') as HTMLButtonElement;
  const statusEl   = root.querySelector('#gameStatus') as HTMLDivElement;
  const canvasEl   = root.querySelector('#gameCanvas');
  if (!(canvasEl instanceof HTMLCanvasElement)) throw new Error('#gameCanvas not found');

  let controls: ReturnType<typeof startLocalScene> | null = null;

  // 장면 생성
	controls = startLocalScene(canvasEl, {
		onStatus: (m) => (statusEl.textContent = m),
		onScore: (p1, p2) => (statusEl.textContent = `🎯 Score: ${p1} - ${p2}`),
		onGameOver: (w) => {
			statusEl.textContent = `🏆 Game Over! ${w} wins!`;
			restartBtn.disabled = false;
			startBtn.disabled = false;
		}
	});
  statusEl.textContent = '✅ Model loaded. Press Start.';

  startBtn.addEventListener('click', () => {
    try {
      startBtn.disabled = true;
      controls?.start();
      restartBtn.disabled = false;
    } catch (e) {
      console.error(e);
      statusEl.textContent = '❌ Failed to start.';
      startBtn.disabled = false;
    }
  });

  restartBtn.addEventListener('click', () => {
    if (!controls) return;
    controls.restart();
    restartBtn.disabled = true;
  });

  lobbyBtn.addEventListener('click', () => {
    controls?.dispose();
    window.location.href = '/lobby';
  });
}
