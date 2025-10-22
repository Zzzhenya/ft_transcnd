
import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
export default function (root: HTMLElement, ctx: any) {
  const user = getAuth();
  const state = getState();
  const isGuest = !user && !!state.session.alias;
  // Determine display name and status
  let playerListHtml = "";
  let playersJoined = 0;
  if (user) {
    playersJoined = 1;
    playerListHtml = `
      <li class="flex items-center gap-2 text-green-700 font-semibold">
        <span>🟢</span>
        <span>${user.name || "You"} (You)</span>
      </li>
    `;
  } else if (isGuest) {
    playersJoined = 1;
    playerListHtml = `
      <li class="flex items-center gap-2 text-blue-700 font-semibold">
        <span>🔵</span>
        <span>${state.session.alias} (Guest)</span>
      </li>
    `;
  } else {
    playersJoined = 0;
    playerListHtml = `
      <li class="flex items-center gap-2 text-gray-400">
        <span>⏳</span>
        <span>Waiting for player...</span>
      </li>
    `;
  }
  root.innerHTML = `
    <section class="max-w-xl mx-auto py-8 space-y-6">
      <h2 class="text-2xl font-bold text-center mb-2">
        Tournament Waiting Room
      </h2>
      <div class="text-center text-gray-700 mb-4">
        Players Joined: ${playersJoined}
      </div>
      <div class="rounded-xl border bg-white shadow p-4 space-y-4">
        <h3 class="font-semibold mb-2">Player List:</h3>
        <ul class="space-y-1">
          ${playerListHtml}
        </ul>
        <div class="flex justify-center mt-2">
          <button
            class="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
            id="inviteBtn"
            ${isGuest ? "disabled" : ""}
          >
            Invite Friend
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
        <button id="backBtn" class="px-4 py-2 rounded bg-gray-400 text-white">← Back to Tournament Lobby</button>
      </div>
    </section>
  `;
  // Add event listener for the back button
const lobbyBtn = root.querySelector<HTMLButtonElement>("#backBtn");
if (lobbyBtn) {
  lobbyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate("/tournaments");
  });
}
}

