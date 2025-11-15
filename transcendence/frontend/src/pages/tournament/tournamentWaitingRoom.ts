/**
 * Tournament Waiting Room Page
 * 
 * PURPOSE:
 * - Shows tournament bracket and match list
 * - Allows players to join before tournament starts
 * - Displays match status and play buttons during tournament
 * - Handles interrupted tournament status display
 * 
 * KEY FEATURES:
 * 1. Player Management: Add guests, join with authenticated users
 * 2. Tournament Start: Creates bracket when all players have joined
 * 3. Match Play: "Play Match" buttons for available matches
 * 4. Interruption Display: Shows banner and disables matches when interrupted
 * 
 * INTERRUPTION HANDLING:
 * - Checks tournamentStatus from backend
 * - If status === 'interrupted':
 *   * Shows prominent red warning banner
 *   * Disables all "Play Match" buttons (canPlayMatch condition)
 *   * Displays "Back to Lobby" button
 *   * Shows interrupted matches with red badges
 * - Users can view but not play matches in interrupted tournaments
 * 
 * MATCH STATE TRACKING:
 * - Clears old match state before starting new match
 * - Prevents duplicate match starts
 * - SessionStorage key pattern: `match_${tournamentId}_${matchId}`
 */

import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { renderTournamentWinner, attachWinnerEventListeners } from "./tournamentWinner";
import { API_BASE } from "@/app/config";

export default function (root: HTMLElement, ctx: any) {
  const user = getAuth();
  const state = getState();
  const isGuest = !user && !!state.session?.alias;
  
  // Try to get maxPlayers from sessionStorage first, default to 4
  let maxPlayers = 4;
  try {
    const savedSize = sessionStorage.getItem("currentTournamentSize");
    if (savedSize) {
      maxPlayers = Number(savedSize);
    }
  } catch {
    maxPlayers = 4;
  }

  // Save tournament ID from URL params to sessionStorage on page load
  const tournamentId = ctx?.params?.id || ctx?.params?.tournamentId;
  if (tournamentId) {
    sessionStorage.setItem("currentTournamentId", tournamentId.toString());
  }

  // Keep guest list persistent across renders
  let guestList: string[] = [];
  let bracket: any = null;
  let tournamentStatus = 'waiting'; // Track tournament status (waiting, active, completed, interrupted)

  function getSavedPlayers(): string[] {
    try {
      return JSON.parse(sessionStorage.getItem("tournamentPlayers") || "[]");
    } catch {
      return [];
    }
  }

  async function fetchTournamentSize() {
    // Fetch tournament size from the tournaments list
    const tid = ctx?.params?.id || ctx?.params?.tournamentId || sessionStorage.getItem("currentTournamentId");
    if (!tid) return;
    
    try {
      const response = await fetch(`${API_BASE}/tournaments`);
      if (response.ok) {
        const data = await response.json();
        const tournament = data.tournaments?.find((t: any) => t.id === Number(tid));
        if (tournament && tournament.size) {
          maxPlayers = tournament.size;
          sessionStorage.setItem("currentTournamentSize", maxPlayers.toString());
          console.log(`Tournament ${tid} size: ${maxPlayers}`);
        }
      }
    } catch (error) {
      console.error("Error fetching tournament size:", error);
    }
  }

  async function fetchBracket() {
    // Get tournament ID from context, URL params, or sessionStorage
    const tid = ctx?.params?.id || ctx?.params?.tournamentId || sessionStorage.getItem("currentTournamentId");
    if (!tid) return;
    
    try {
      const response = await fetch(`${API_BASE}/tournaments/${tid}/bracket`);
      if (response.ok) {
        const data = await response.json();
        bracket = data.bracket; // Extract the bracket object from the response
        tournamentStatus = data.status || 'waiting'; // Get tournament status
        // Update maxPlayers from bracket response if available (works even for finished tournaments)
        if (data.size) {
          maxPlayers = data.size;
          sessionStorage.setItem("currentTournamentSize", maxPlayers.toString());
          console.log(`Tournament ${tid} size from bracket: ${maxPlayers}`);
        }
      }
    } catch (error) {
      console.error("Error fetching bracket:", error);
    }
  }

  async function render() {
    // First try to fetch tournament size from bracket (works always, even for finished tournaments)
    await fetchBracket();
    // If bracket doesn't exist yet, fetch from tournaments list
    if (!bracket) {
      await fetchTournamentSize();
    }
    // Try to restore from sessionStorage if available
    let savedPlayers = getSavedPlayers();
    let players: { name: string; type: "user" | "guest" }[] = [];

    if (savedPlayers.length > 0) {
      // If coming back from a match or reload, use saved list
      players = savedPlayers.map(name => {
        if (user && name === (user.name ?? "You")) {
          return { name, type: "user" };
        }
        if (isGuest && name === (state.session?.alias ?? "Guest")) {
          return { name, type: "guest" };
        }
        return { name, type: "guest" };
      });
      // Also update guestList for addGuest logic
      guestList = players.filter(p => p.type === "guest" && (!user || p.name !== user.name)).map(p => p.name);
    } else {
      // Build from current session
      if (user) {
        players.push({ name: user.name ?? "You", type: "user" });
      } else if (isGuest) {
        players.push({ name: state.session?.alias ?? "Guest", type: "guest" });
      }
      guestList.forEach(alias => {
        players.push({ name: alias, type: "guest" });
      });
    }

    // Build player list HTML
    let playerListHtml = "";
    for (let i = 0; i < maxPlayers; ++i) {
      const player = players[i];
      if (player) {
        playerListHtml += `
          <li class="flex items-center gap-3 p-4 rounded-2xl ${player.type === "user" ? "bg-green-500/20" : "bg-blue-500/20"} border border-white/20 backdrop-blur-sm">
            <div class="flex items-center justify-center w-12 h-12 rounded-full ${player.type === "user" ? "bg-green-500" : "bg-blue-500"} text-white font-black text-lg shadow-lg">
              ${player.type === "user" ? "✓" : "G"}
            </div>
            <div class="flex-1">
              <div class="text-white font-bold text-lg">${player.name}</div>
              <div class="text-xs ${player.type === "user" ? "text-green-300" : "text-blue-300"} uppercase font-bold">
                ${player.type === "user" ? "USER" : "GUEST"}
              </div>
            </div>
          </li>
        `;
      } else {
        playerListHtml += `
          <li class="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 border-dashed backdrop-blur-sm">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 text-white/30">
              <span class="animate-pulse text-2xl">⏳</span>
            </div>
            <div class="text-white/40 italic font-semibold">Waiting...</div>
          </li>
        `;
      }
    }

    // Check if tournament has started (bracket exists with rounds)
    const tournamentStarted = bracket && bracket.rounds && bracket.rounds.length > 0;

    root.innerHTML = `
      <section class="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-12 px-4">
        <div class="max-w-6xl mx-auto">
        
        <!-- Header -->
        <div class="text-center mb-12">
          <div class="text-6xl mb-4 filter drop-shadow-2xl">${tournamentStarted ? '⚔️' : '🎮'}</div>
          <h2 class="text-5xl font-black text-white mb-4 tracking-tight">
            ${tournamentStarted ? 'TOURNAMENT LIVE' : 'WAITING ROOM'}
          </h2>
          ${tournamentStatus === 'interrupted' ? `
            <div class="bg-red-500/20 border-2 border-red-500 rounded-2xl p-6 mb-6 backdrop-blur-sm max-w-2xl mx-auto">
              <div class="text-red-200 mb-4">
                <div class="text-2xl font-black mb-2">⚠️ TOURNAMENT INTERRUPTED</div>
                <p class="text-sm">A player left during a match. No further matches can be played.</p>
              </div>
              <button
                id="backToLobbyBtn"
                class="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all transform hover:scale-105"
              >
                ← Back to Tournament Lobby
              </button>
            </div>
          ` : ''}
          ${!tournamentStarted ? `
            <div class="inline-block px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span class="font-black text-white text-lg">${players.length} / ${maxPlayers} PLAYERS</span>
            </div>
          ` : ''}
        </div>

        ${!tournamentStarted ? `
          <div class="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10 mb-8">
            <ul class="grid grid-cols-2 gap-4 mb-8">${playerListHtml}</ul>

            <div class="flex justify-center gap-4 pt-6 border-t border-white/10">
              <button
                class="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black transition-all transform hover:scale-105 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
                id="inviteBtn"
                ${isGuest ? "disabled" : ""}
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">📧</span>
                  <span>INVITE</span>
                </div>
              </button>
              <button
                class="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black transition-all transform hover:scale-105 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none"
                id="addGuestBtn"
                ${players.length >= maxPlayers ? "disabled" : ""}
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">➕</span>
                  <span>ADD GUEST</span>
                </div>
              </button>
              <button
                class="px-8 py-4 rounded-2xl font-black text-lg transition-all transform shadow-xl ${players.length < maxPlayers
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white hover:scale-105'}"
                id="startTournamentBtn"
                ${players.length < maxPlayers ? "disabled" : ""}
              >
                <div class="flex items-center gap-2">
                  <span class="text-xl">🚀</span>
                  <span>START</span>
                </div>
              </button>
            </div>
          </div>
        ` : ''}

        ${tournamentStarted ? `
        <div class="bg-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div class="text-4xl">🏆</div>
              <h3 class="font-black text-3xl text-white">BRACKET</h3>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="flex items-center gap-1 px-3 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold"><span>👥</span> LOCAL</span>
              <span class="flex items-center gap-1 px-3 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold"><span>🌐</span> REMOTE</span>
            </div>
          </div>
          ${bracket && bracket.rounds ? `
            <div class="space-y-6">
              ${bracket.rounds.map((round: any[], roundIndex: number) => {
                const readyMatches = round.filter(m => m.player1 && m.player2 && !m.winner).length;
                const completedMatches = round.filter(m => m.winner).length;
                
                // Get local players from sessionStorage
                let localPlayers: string[] = [];
                try {
                  localPlayers = JSON.parse(sessionStorage.getItem("tournamentLocalPlayers") || "[]");
                } catch {
                  localPlayers = [];
                }
                
                return `
                <div class="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div class="font-black mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black">
                        ${roundIndex + 1}
                      </div>
                      <span class="text-xl text-white">ROUND ${roundIndex + 1}</span>
                    </div>
                    <div class="flex gap-2">
                      ${readyMatches > 0 ? `<span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">${readyMatches} READY</span>` : ''}
                      ${completedMatches > 0 && readyMatches === 0 ? `<span class="px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">✓ DONE</span>` : ''}
                    </div>
                  </div>
                  <div class="space-y-3">
                  ${round.map((match: any, matchIdx: number) => {
                    // Determine match type
                    const isPlayer1Local = localPlayers.includes(match.player1);
                    const isPlayer2Local = localPlayers.includes(match.player2);
                    const bothPlayersLocal = isPlayer1Local && isPlayer2Local;
                    const hasLocalPlayer = isPlayer1Local || isPlayer2Local;
                    const isRemoteMatch = match.player1 && match.player2 && !bothPlayersLocal;
                    
                    /**
                     * Determine if "Play Match" button should be enabled
                     * 
                     * CRITICAL INTERRUPTION CHECK:
                     * - First condition: tournamentStatus !== 'interrupted'
                     * - This ensures NO matches can be played if tournament is interrupted
                     * - Even if match has both players and no winner, button is disabled
                     * 
                     * Other conditions (only checked if not interrupted):
                     * - match.player1 && match.player2: Both players assigned
                     * - !match.winner: No winner declared yet
                     * - hasLocalPlayer: At least one local player in this match
                     */
                    const canPlayMatch = tournamentStatus !== 'interrupted' && match.player1 && match.player2 && !match.winner && hasLocalPlayer;
                    
                    return `
                    <div class="flex justify-between items-center p-4 rounded-xl border transition-all ${
                      match.status === 'interrupted' ? 'bg-red-500/20 border-red-500/30' :
                      match.status === 'forfeited' ? 'bg-orange-500/20 border-orange-500/30' :
                      match.winner ? 'bg-green-500/20 border-green-500/30' : 
                      match.player1 && match.player2 ? 'bg-white/10 border-white/20 hover:bg-white/15' : 
                      'bg-white/5 border-white/10'
                    }">
                      <div class="flex-1">
                        <span class="${match.winner === match.player1 ? 'font-black text-green-400 text-lg' : 'text-white font-bold'}">${match.player1 || 'TBD'}${isPlayer1Local ? ' 🔵' : ''}</span>
                        <span class="px-3 text-white/40 font-black">VS</span>
                        <span class="${match.winner === match.player2 ? 'font-black text-green-400 text-lg' : 'text-white font-bold'}">${match.player2 || 'TBD'}${isPlayer2Local ? ' 🔵' : ''}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        ${match.status === 'interrupted' ? `
                          <span class="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-black shadow-lg">❌ INTERRUPTED</span>
                        ` : match.status === 'forfeited' ? `
                          <span class="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-black shadow-lg">⚠️ FORFEIT - ${match.winner}</span>
                        ` : match.status === 'completed' && match.winner ? `
                          <span class="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-black shadow-lg">🏆 ${match.winner}</span>
                        ` : match.player1 && match.player2 && !match.winner ? `
                          ${bothPlayersLocal ? `
                            <span class="px-3 py-1 rounded-full bg-purple-500/30 border border-purple-500/50 text-purple-300 text-xs font-bold">👥 LOCAL</span>
                          ` : isRemoteMatch && hasLocalPlayer ? `
                            <span class="px-3 py-1 rounded-full bg-blue-500/30 border border-blue-500/50 text-blue-300 text-xs font-bold">🌐 REMOTE</span>
                          ` : !hasLocalPlayer ? `
                            <span class="px-3 py-1 rounded-full bg-orange-500/30 border border-orange-500/50 text-orange-300 text-xs font-bold">⏳ WAITING</span>
                          ` : ''}
                          ${canPlayMatch ? `
                            <button 
                              class="play-match-btn px-6 py-3 rounded-xl font-black text-sm transition-all transform hover:scale-105 shadow-lg ${bothPlayersLocal ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white'}"
                              data-match-id="${match.matchId}"
                              data-player1="${match.player1}"
                              data-player2="${match.player2}"
                              data-round="${roundIndex + 1}"
                              data-match-type="${bothPlayersLocal ? 'local' : 'remote'}"
                            >
                              ▶ PLAY
                            </button>
                          ` : !hasLocalPlayer && match.player1 && match.player2 ? `
                            <span class="text-xs text-white/40 italic">Waiting...</span>
                          ` : ''}
                        ` : !match.player1 || !match.player2 ? `<span class="text-white/40 text-xs">Waiting...</span>` : ''}
                      </div>
                    </div>
                  `}).join('')}
                  </div>
                </div>
              `}).join('')}
            </div>
          ` : `
            <div class="text-center py-12">
              <div class="text-6xl mb-4 animate-pulse">⏳</div>
              <div class="text-gray-500 text-lg font-medium">Tournament bracket will appear here</div>
              <div class="text-gray-400 text-sm">Start the tournament when all players have joined</div>
            </div>
          `}
        </div>
        ` : ''}

        ${renderTournamentWinner(bracket)}

        <div class="flex justify-center mt-8">
          <button id="backBtn" class="px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-black hover:bg-white/20 transition-all transform hover:scale-105">
            ← BACK TO LOBBY
          </button>
        </div>

        <dialog id="guestDialog" class="rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-slate-800 to-purple-900 border-2 border-white/20 max-w-sm w-full backdrop-blur-lg">
          <form id="guestDialogForm" method="dialog" class="space-y-4">
            <label class="block font-black text-white text-lg">GUEST NAME:</label>
            <input id="guestDialogAlias" type="text" maxlength="16" class="border-2 border-white/20 rounded-xl px-4 py-3 w-full bg-white/10 text-white placeholder-white/40 font-bold focus:outline-none focus:border-purple-400" placeholder="Enter name" required />
            <div class="flex gap-3 justify-end">
              <button type="submit" class="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black hover:from-green-400 hover:to-emerald-500 transition-all">ADD</button>
              <button type="button" id="guestDialogCancel" class="px-6 py-3 rounded-xl bg-white/10 text-white font-black hover:bg-white/20 transition-all">CANCEL</button>
            </div>
          </form>
        </dialog>
      </div>
      </section>
    `;

    // --- Event Listeners ---
    const lobbyBtn = root.querySelector<HTMLButtonElement>("#backBtn");
    lobbyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.removeItem("tournamentPlayers");
      sessionStorage.removeItem("currentTournamentSize");
      sessionStorage.removeItem("tournamentLocalPlayers");
      sessionStorage.removeItem("tournamentPlayerTypes");
      navigate("/tournaments");
    });

    // Back to lobby button for interrupted tournaments
    const backToLobbyBtn = root.querySelector<HTMLButtonElement>("#backToLobbyBtn");
    backToLobbyBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.removeItem("tournamentPlayers");
      sessionStorage.removeItem("currentTournamentSize");
      sessionStorage.removeItem("tournamentLocalPlayers");
      sessionStorage.removeItem("tournamentPlayerTypes");
      navigate("/tournaments");
    });

    // Attach winner event listeners (for "New Tournament" button)
    attachWinnerEventListeners(root);

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
        startBtn.addEventListener("click", async () => {
          try {
            // Get tournament ID from context or sessionStorage
            const tid = ctx?.params?.id || ctx?.params?.tournamentId || sessionStorage.getItem("currentTournamentId");
            if (!tid) {
              alert("Tournament ID not found!");
              return;
            }
            
            // Start the tournament using the /tournaments/:id/start endpoint
            const response = await fetch(`${API_BASE}/tournaments/${tid}/start`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: 'include',
              body: JSON.stringify({ 
                players: players.map(p => p.name),
                size: maxPlayers
              })
            });

            if (!response.ok) {
              throw new Error(`Failed to start tournament: ${response.statusText}`);
            }

            const result = await response.json();
            console.log("Tournament started:", result);

            // Save the tournament ID and player info with types
            sessionStorage.setItem("currentTournamentId", tid.toString());
            sessionStorage.setItem("tournamentPlayers", JSON.stringify(players.map(p => p.name)));
            // Save player types and which players are local to this browser
            const localPlayers = players.filter(p => 
              (user && p.name === user.name) || // Current registered user
              (isGuest && p.name === state.session?.alias) || // Current guest
              p.type === "guest" // All guests added from this browser
            ).map(p => p.name);
            sessionStorage.setItem("tournamentLocalPlayers", JSON.stringify(localPlayers));
            sessionStorage.setItem("tournamentPlayerTypes", JSON.stringify(players));
            
            // Re-render to show the bracket
            await render();
          } catch (error) {
            console.error("Error creating tournament:", error);
            alert("Failed to create tournament. Please try again.");
          }
        }, { once: true });
      }
    }

    // Play Match buttons
    const playMatchButtons = root.querySelectorAll<HTMLButtonElement>('.play-match-btn');
    console.log(`Found ${playMatchButtons.length} play match buttons`);
    playMatchButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        console.log('Play Match button clicked!');
        const matchId = btn.getAttribute('data-match-id');
        const player1 = btn.getAttribute('data-player1');
        const player2 = btn.getAttribute('data-player2');
        const round = btn.getAttribute('data-round');
        const matchType = btn.getAttribute('data-match-type'); // 'local' or 'remote'
        
        console.log('Match details:', { matchId, player1, player2, round, matchType });
        
        // Clear any old match state for this match (in case of refresh/restart)
        const tid = sessionStorage.getItem('currentTournamentId');
        if (tid && matchId) {
          const oldMatchKey = `match_${tid}_${matchId}`;
          sessionStorage.removeItem(oldMatchKey);
          console.log(`Cleared old match state for ${oldMatchKey}`);
        }
        
        // Store match info in sessionStorage
        sessionStorage.setItem('currentMatchId', matchId || '');
        sessionStorage.setItem('currentMatchPlayers', JSON.stringify([player1, player2]));
        sessionStorage.setItem('currentMatchRound', round || '1');
        sessionStorage.setItem('currentMatchType', matchType || 'remote');
        
        console.log('Navigating to /tournaments/match');
        // Navigate to match page
        navigate('/tournaments/match');
      });
    });
  }

  // Initial render
  render();

  // Auto-refresh bracket periodically to show updates
  // But pause refresh if a dialog is open to prevent interrupting user input
  const refreshInterval = setInterval(async () => {
    const guestDialog = root.querySelector<HTMLDialogElement>("#guestDialog");
    // Only refresh if no dialog is open
    if (!guestDialog || !guestDialog.open) {
      await fetchBracket();
      await render();
    }
  }, 3000); // Refresh every 3 seconds

  // Refresh when page becomes visible (e.g., returning from a match)
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible') {
      const guestDialog = root.querySelector<HTMLDialogElement>("#guestDialog");
      // Only refresh if no dialog is open
      if (!guestDialog || !guestDialog.open) {
        await fetchBracket();
        await render();
      }
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function to remove innerHTML + detach events
  return () => {
    root.innerHTML = "";
    clearInterval(refreshInterval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}