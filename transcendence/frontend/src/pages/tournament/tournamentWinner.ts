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
        <div class="flex justify-center mb-2">
          <img src="/icons/trophy.png" class="icon-px-lg" alt="Champion" style="width: 64px; height: 64px;">
        </div>
        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 mb-2">
          Tournament Champion!
        </h2>
        <div class="text-3xl font-extrabold text-orange-600 mb-3 drop-shadow-lg flex items-center justify-center gap-3">
          <img src="/icons/peace_sign.png" class="icon-px-lg" alt="Victory" style="width: 32px; height: 32px;">
          ${winner}
          <img src="/icons/peace_sign.png" class="icon-px-lg" alt="Victory" style="width: 32px; height: 32px;">
        </div>
        
        <!-- Tournament Stats -->
        <div class="bg-white rounded-lg p-3 mb-3 shadow-md">
          <div class="text-xs font-semibold text-gray-600 mb-1">Tournament Summary</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div class="text-gray-500 flex items-center justify-center gap-1">
                <img src="/icons/people.png" class="icon-px" alt="Players" style="width: 16px; height: 16px;">
                Total Players
              </div>
              <div class="font-bold text-base">${totalPlayers}</div>
            </div>
            <div>
              <div class="text-gray-500 flex items-center justify-center gap-1">
                <img src="/icons/trophy.png" class="icon-px" alt="Rounds" style="width: 16px; height: 16px;">
                Total Rounds
              </div>
              <div class="font-bold text-base">${totalRounds}</div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-2">
          <button id="newTournamentBtn" class="btn-retro px-4 py-2 rounded-lg text-white font-semibold transition-all transform hover:scale-105 shadow-md flex items-center gap-2">
            <img src="/icons/rocket.png" class="icon-px icon-px--violet" alt="New Tournament">
            Start New Tournament
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
    // Clear tournament data
    sessionStorage.removeItem("tournamentPlayers");
    sessionStorage.removeItem("currentTournamentId");
    sessionStorage.removeItem("currentTournamentSize");
    sessionStorage.removeItem("tournamentLocalPlayers");
    sessionStorage.removeItem("tournamentPlayerTypes");

    // Clear guest alias (force user to create new guest name for next tournament)
    sessionStorage.removeItem("guestAlias");

    // Trigger auth change to update UI
    window.dispatchEvent(new CustomEvent("auth:changed"));

    navigate("/tournaments");
  });
}