import { navigate } from "@/app/router";

export function renderTournamentWinner(bracket: any): string {
  if (!bracket || !bracket.rounds || !bracket.rounds.at(-1)?.[0]?.winner) {
    return '';
  }

  const winner = bracket.rounds.at(-1)[0].winner;
  const totalPlayers = bracket.rounds[0]?.length * 2 || 0;
  const totalRounds = bracket.rounds.length;

  return `
    <div class="rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 shadow-lg p-4 space-y-3">
      <div class="text-center">
        <div class="text-4xl mb-2">🏆</div>
        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 mb-2">
          Tournament Champion!
        </h2>
        <div class="text-3xl font-extrabold text-orange-600 mb-3 drop-shadow-lg">
          🎉 ${winner} 🎉
        </div>
        
        <!-- Tournament Stats -->
        <div class="bg-white rounded-lg p-3 mb-3 shadow-md">
          <div class="text-xs font-semibold text-gray-600 mb-1">Tournament Summary</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div class="text-gray-500">Total Players</div>
              <div class="font-bold text-base">${totalPlayers}</div>
            </div>
            <div>
              <div class="text-gray-500">Total Rounds</div>
              <div class="font-bold text-base">${totalRounds}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-2">
          <button id="newTournamentBtn" class="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-md">
            🎮 Start New Tournament
          </button>
        </div>
      </div>
    </div>
  `;
}

export function attachWinnerEventListeners(root: HTMLElement) {
  const newTournamentBtn = root.querySelector<HTMLButtonElement>("#newTournamentBtn");
  newTournamentBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem("tournamentPlayers");
    sessionStorage.removeItem("currentTournamentId");
    sessionStorage.removeItem("currentTournamentSize");
    sessionStorage.removeItem("tournamentLocalPlayers");
    sessionStorage.removeItem("tournamentPlayerTypes");
    navigate("/tournaments");
  });
}
