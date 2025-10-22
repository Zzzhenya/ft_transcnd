
import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";

export default function (root: HTMLElement, ctx: any) {
  const user = getAuth();
  const state = getState();
  const isGuest = !user && !!state.session?.alias;
  const maxPlayers = ctx?.maxPlayers || 4;

  // Keep guest list persistent across renders
  let guestList: string[] = [];

  function render() {
    // Collect current players
    let players: { name: string; type: "user" | "guest" }[] = [];
    if (user) {
      players.push({ name: user.name ?? "You", type: "user" });
    } else if (isGuest) {
      players.push({ name: state.session?.alias ?? "Guest", type: "guest" });
    }
    guestList.forEach(alias => {
      players.push({ name: alias, type: "guest" });
    });

    // Build player list HTML
    let playerListHtml = "";
    for (let i = 0; i < maxPlayers; ++i) {
      const player = players[i];
      if (player) {
        playerListHtml += `
          <li class="flex items-center gap-2 ${player.type === "user" ? "text-green-700" : "text-blue-700"} font-semibold">
            <span>${player.type === "user" ? "🟢" : "🔵"}</span>
            <span>${player.name}${player.type === "user" ? " (You)" : " (Guest)"}</span>
          </li>
        `;
      } else {
        playerListHtml += `
          <li class="flex items-center gap-2 text-gray-400">
            <span>⏳</span>
            <span>Waiting for player...</span>
          </li>
        `;
      }
    }

    root.innerHTML = `
      <section class="max-w-xl mx-auto py-8 space-y-6">
        <h2 class="text-2xl font-bold text-center mb-2">
          Tournament Waiting Room
        </h2>
        <div class="text-center text-gray-700 mb-4">
          Players Joined: ${players.length} / ${maxPlayers}
        </div>

        <div class="rounded-xl border bg-white shadow p-4 space-y-4">
          <h3 class="font-semibold mb-2">Player List:</h3>
          <ul class="space-y-1">${playerListHtml}</ul>

          <div class="flex justify-center gap-2 mt-2">
            <button
              class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
              id="inviteBtn"
              ${isGuest ? "disabled" : ""}
            >
              Invite Friend
            </button>
            <button
              class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
              id="addGuestBtn"
              ${players.length >= maxPlayers ? "disabled" : ""}
            >
              Add Guest
            </button>
            <button
              class="px-4 py-2 rounded transition ${players.length < maxPlayers
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'}"
              id="startTournamentBtn"
              ${players.length < maxPlayers ? "disabled" : ""}
            >
              Start Tournament
            </button>
          </div>
        </div>

        <div class="rounded-xl border bg-white shadow p-4 space-y-4">
          <h3 class="font-semibold mb-2">Tournament Bracket:</h3>
          <div>
            <div class="font-bold mb-1">Semi-Finals:</div>
            <div class="flex justify-between px-2">
              <span>TBD</span>
              <span>vs</span>
              <span>TBD</span>
              <span class="ml-2 text-gray-500 text-sm">waiting</span>
            </div>
          </div>
          <div class="mt-3">
            <div class="font-bold mb-1">Final:</div>
            <div class="flex justify-between px-2">
              <span>Winner SF1</span>
              <span>vs</span>
              <span>Winner SF2</span>
            </div>
          </div>
        </div>

        <div class="flex justify-center mt-6">
          <button id="backBtn" class="px-4 py-2 rounded bg-gray-400 text-white">
            ← Back to Tournament Lobby
          </button>
        </div>

        <dialog id="guestDialog" class="rounded-xl p-4 shadow bg-white border max-w-xs w-full">
          <form id="guestDialogForm" method="dialog" class="space-y-2">
            <label class="block font-semibold">Guest Alias:</label>
            <input id="guestDialogAlias" type="text" maxlength="16" class="border rounded px-2 py-1 w-full" placeholder="Enter alias" required />
            <div class="flex gap-2 justify-end">
              <button type="submit" class="px-3 py-1 rounded bg-green-600 text-white">Add</button>
              <button type="button" id="guestDialogCancel" class="px-3 py-1 rounded bg-gray-300 text-gray-700">Cancel</button>
            </div>
          </form>
        </dialog>
      </section>
    `;

    // --- Event Listeners ---
    const lobbyBtn = root.querySelector<HTMLButtonElement>("#backBtn");
    lobbyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("/tournaments");
    });

    // Add Guest button
    const addGuestBtn = root.querySelector<HTMLButtonElement>("#addGuestBtn");
    if (addGuestBtn) {
      addGuestBtn.addEventListener("click", () => {
        const guestDialog = root.querySelector<HTMLDialogElement>("#guestDialog");
        guestDialog?.showModal();

        const guestDialogForm = root.querySelector<HTMLFormElement>("#guestDialogForm");
        guestDialogForm?.addEventListener("submit", (e) => {
          e.preventDefault();
          const alias = (root.querySelector<HTMLInputElement>("#guestDialogAlias")?.value || "").trim();

          const aliasExists = players.some(p => p.name.toLowerCase() === alias.toLowerCase());
          if (!alias) {
            alert("Alias cannot be empty.");
          } else if (aliasExists) {
            alert("Alias already exists. Please choose another.");
          } else if (players.length < maxPlayers) {
            guestList.push(alias);
            guestDialog?.close();
            render();
          }
        }, { once: true });

        const guestDialogCancel = root.querySelector<HTMLButtonElement>("#guestDialogCancel");
        guestDialogCancel?.addEventListener("click", () => {
          guestDialog?.close();
        }, { once: true });
      });
    }
const startBtn = root.querySelector<HTMLButtonElement>("#startTournamentBtn");
if (startBtn) {
  startBtn.disabled = players.length !== maxPlayers;
  if (players.length === maxPlayers) {
    startBtn.addEventListener("click", () => {
      sessionStorage.setItem("tournamentPlayers", JSON.stringify(players.map(p => p.name)));
      navigate("/tournaments/match");
    }, { once: true });
  }
}

  }

  render();

  // Return cleanup function to remove innerHTML + detach events
  return () => {
    root.innerHTML = "";
  };
}
