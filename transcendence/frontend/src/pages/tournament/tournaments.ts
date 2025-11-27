/**
 * Tournament Lobby Page
 * 
 * PURPOSE:
 * - Display all available tournaments created by me
 * - Allow users to create new tournaments (4P or 8P)
 * - Join existing tournaments
 * - Show interrupted tournament status
 * 
 * KEY FEATURES:
 * 1. Tournament List: Shows all tournaments with player count
 * 2. Filter Tabs: Filter by tournament size (ALL, 4P, 8P)
 * 3. Create Buttons: Create new 4-player or 8-player tournaments
 * 4. Join Functionality: Navigate to waiting room for specific tournament
 * 5. Interrupted Status: Visual indicators for interrupted tournaments
 * 
 * INTERRUPTION DISPLAY:
 * - Checks each tournament's status
 * - If status === 'interrupted':
 *   * Shows ⚠️ INTERRUPTED badge in top-left
 *   * Red border instead of white/hover
 *   * Dimmed appearance (70% opacity)
 *   * Red warning text: "Match interrupted - Cannot join"
 *   * Button changes to "VIEW ONLY" (gray, disabled)
 * - Users can still click to view interrupted tournaments but cannot join
 */

import { getAuth } from "@/app/auth";
import { navigate } from "@/app/router";
import { API_BASE } from "@/app/config";

export default function (root: HTMLElement) {
    let tournaments: any[] = [];
    let filter: number | "all" = "all";


    const clearTournamentSession = () => {
        sessionStorage.removeItem("currentTournamentSize");
        sessionStorage.removeItem("currentTournamentId");
        sessionStorage.removeItem("tournamentPlayers");
        sessionStorage.removeItem("tournamentLocalPlayers");
        sessionStorage.removeItem("tournamentPlayerTypes");
    };

    const maybeClearTournamentSession = () => {
        const activeId = sessionStorage.getItem("currentTournamentId");
        if (!activeId) {
            clearTournamentSession();
            return;
        }

        const activeTournament = tournaments.find(t => t.id === Number(activeId));
        if (!activeTournament || activeTournament.status === 'completed' || activeTournament.status === 'interrupted') {
            clearTournamentSession();
        }
    };

    async function fetchTournaments() {
        const user = getAuth();
        // ✅ Check if user is logged in BEFORE making API call
        if (!user) {
            console.log("🔒 No user logged in, redirecting to login...");
            navigate('/auth?redirect=/tournaments');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/tournaments`, { credentials: 'include' });

            // ✅ Handle 401 response (token expired or invalid)
            if (res.status === 401 || res.status === 403) {
                console.log("🔒 Authentication failed, redirecting to login...");
                // Clear invalid auth data
                sessionStorage.clear();
                localStorage.clear();
                // Redirect to login with return path
                navigate('/auth?redirect=/tournaments');
                return;
            }

            if (!res.ok) {
                throw new Error(`Failed to fetch tournaments: ${res.status}`);
            }

            const data = await res.json();
            const allTournaments = data.tournaments || [];

            console.log("🔍 /tournaments response:", allTournaments);
            console.log("🔍 current user:", user);

            if (user) {
            const myId = Number(user.id);

            tournaments = allTournaments.filter((t: any) => {
                // from backend: creatorId / creatorName / createdBy
                const creatorId = t.creatorId ?? t.createdBy?.id ?? null;
                return (
                    (creatorId != null && Number(creatorId) === myId)
                );
            });
        } else {
            // Not logged in → show none
            tournaments = [];
        }
            maybeClearTournamentSession();
        } catch (error) {
            console.error("❌ Error fetching tournaments:", error);
            tournaments = [];
        }
    }


    async function render() {
        const user = getAuth();
        const signedIn = !!user;

        root.innerHTML = `
        <section class="retro-wait min-h-screen py-6 px-4">
            <div class="max-w-6xl mx-auto">
                
                <!-- Header -->
                <div class="bezel rounded-2xl p-5 md:p-6 border mb-6">
                    <div class="flex justify-between items-center mb-4 px-2">
                        <button id="backBtn" class="btn-retro px-4 py-2 rounded-lg text-white">
                            <img src="/icons/arrow.png" class="icon-px icon-px--violet mr-2 align-middle inline" alt="Back"> BACK
                        </button>
                        ${signedIn ? `
                            <button id="logoutBtn" class="btn-retro px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">
                                LOGOUT
                            </button>
                        ` : `
                            <button id="loginBtn" class="btn-retro px-4 py-2 rounded-lg text-white">
                                SIGN IN
                            </button>
                        `}
                    </div>
                    <div class="text-center">
                        <div class="mb-2 flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/trophy.png" alt="Tournament" /></div>
                        <h1 class="text-4xl neon mb-3 tracking-tight font-normal">TOURNAMENT</h1>
                        <div id="userInfo" class="flex justify-center mb-4"></div>
                        <p class="text-sm text-gray-300 uppercase">Challenge friends in bracket-style competitions</p>
                    </div>
                </div>

                <!-- Filter Tabs -->
                <div class="flex justify-center gap-2 mb-4">
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-normal transition-all ${filter === "all" ? "btn-retro text-white" : "bg-black/30 text-white hover:bg-purple-900/20 border border-purple-600/40"}" data-filter="all">
                        ALL
                    </button>
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-normal transition-all ${filter === 4 ? "btn-retro text-white" : "bg-black/30 text-white hover:bg-purple-900/20 border border-purple-600/40"}" data-filter="4">
                        4P
                    </button>
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-normal transition-all ${filter === 8 ? "btn-retro text-white" : "bg-black/30 text-white hover:bg-purple-900/20 border border-purple-600/40"}" data-filter="8">
                        8P
                    </button>
                </div>

                <!-- Tournaments Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    ${tournaments.filter(t => filter === "all" || t.size === filter).length > 0
                ? tournaments
                    .filter(t => filter === "all" || t.size === filter)
                    .map(t => {
                        const isInterrupted = t.status === 'interrupted';
                        const isFinished = t.status === 'finished';
                        const isSpecialStatus = isInterrupted || isFinished;
                        return `
                                <div class="group relative card-violet rounded-2xl p-4 border ${isInterrupted ? 'border-red-500/50' : isFinished ? 'border-green-500/50' : 'border-purple-600/40'} ${isSpecialStatus ? '' : 'hover:bg-purple-900/20'} transition-all duration-300 ${isSpecialStatus ? 'opacity-70' : ''}">
                                    ${isInterrupted ? `
                                        <div class="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-500/30 border border-red-500 backdrop-blur-sm">
                                            <span class="text-xs font-bold text-red-200">
                                                <img src="/icons/hourglass.png" class="icon-px icon-px--violet mr-1 align-middle inline" alt="Interrupted"> INTERRUPTED
                                            </span>
                                        </div>
                                    ` : isFinished ? `
                                        <div class="absolute top-3 left-3 px-3 py-1 rounded-full bg-green-500/30 border border-green-500 backdrop-blur-sm">
                                            <span class="text-xs font-bold text-green-200">
                                                <img src="/icons/trophy.png" class="icon-px icon-px--violet mr-1 align-middle inline" alt="Finished"> FINISHED
                                            </span>
                                        </div>
                                    ` : ''}
                                    <div class="absolute top-3 right-3">
                                        <div class="w-10 h-10 rounded-full bg-gradient-to-br ${t.size === 4 ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-pink-600'} flex items-center justify-center text-white font-bold shadow-lg ${isSpecialStatus ? 'opacity-50' : ''}">
                                            ${t.size}
                                        </div>
                                    </div>
                                    <div class="mb-3 ${isSpecialStatus ? 'mt-8' : ''}">
                                        <div class="text-purple-300 font-mono text-xs mb-1">TOURNAMENT #${t.id}</div>
                                        <div class="text-2xl font-bold text-white mb-1">${t.size} PLAYERS</div>
                                        <div class="flex items-center gap-2 text-sm text-gray-300">
                                            <img src="/icons/people.png" class="icon-px icon-px--violet" alt="Players">
                                            <span class="font-bold">${t.playerSet ? Array.from(t.playerSet).length : (t.players || 0)} / ${t.size}</span>
                                            <span class="text-gray-500 text-xs">joined</span>
                                        </div>
                                        ${isInterrupted ? `
                                            <div class="mt-2 text-xs text-red-300 font-semibold">
                                                Match interrupted - Cannot join
                                            </div>
                                        ` : isFinished ? `
                                            <div class="mt-2 text-xs text-green-300 font-semibold">
                                                Tournament completed - View results
                                            </div>
                                        ` : ''}
                                    </div>
                                    <a href="/tournaments/waitingroom/${t.id}" data-tournament-size="${t.size}" data-tournament-id="${t.id}" class="join-btn block w-full py-3 rounded-xl font-normal text-center transition-all ${isInterrupted ? 'bg-gray-600/50 text-gray-300 hover:bg-gray-600/70 cursor-pointer' : isFinished ? 'bg-green-600/50 text-green-200 hover:bg-green-600/70 cursor-pointer' : 'btn-retro text-white'} ${(!signedIn) ? "opacity-30 pointer-events-none" : ""}">
                                        ${isInterrupted ? 'VIEW DETAILS' : isFinished ? 'VIEW RESULTS' : 'JOIN NOW'}
                                    </a>
                                </div>
                            `}).join('')
                : `<div class="col-span-2 text-center py-12">
                                <div class="mb-3 opacity-20 flex justify-center"><img src="/icons/trophy.png" class="icon-px-lg icon-px--violet" alt="No tournaments"></div>
                                <div class="text-xl text-white/40 font-bold">NO ACTIVE TOURNAMENTS</div>
                            </div>`
            }
                </div>

                <!-- Create Buttons -->
                <div class="flex flex-col sm:flex-row justify-center gap-3 mb-6">
                    <button id="create4Btn" class="group px-8 py-3 rounded-xl btn-retro text-white font-bold transition-all transform hover:scale-105 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none" ${(!signedIn) ? "disabled" : ""}>
                        <div class="flex items-center justify-center gap-2">
                            <img src="/icons/rocket.png" class="icon-px icon-px--violet" alt="Create">
                            <span>CREATE 4P</span>
                        </div>
                    </button>
                    <button id="create8Btn" class="group px-8 py-3 rounded-xl btn-retro text-white font-bold transition-all transform hover:scale-105 shadow-xl disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none" ${(!signedIn) ? "disabled" : ""}>
                        <div class="flex items-center justify-center gap-2">
                            <img src="/icons/meteor.png" class="icon-px icon-px--violet" alt="Create">
                            <span>CREATE 8P</span>
                        </div>
                    </button>
                </div>

                <!-- Back Button -->
                <div class="flex justify-center">
                    <button id="backBtnBottom" class="btn-retro px-6 py-2 rounded-full text-white text-sm font-normal transition-all">
                        <img src="/icons/arrow.png" class="icon-px icon-px--violet mr-2 align-middle inline" alt="Back"> BACK
                    </button>
                </div>
            </div>
        </section>
        `;

        // --- User/Guest info section ---
        const userInfo = root.querySelector<HTMLElement>("#userInfo")!;
        if (user) {
            userInfo.innerHTML = `
                <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <button id="userProfileBtn" class="text-white font-bold bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition" title="Go to your profile">
                        ${user.name}
                    </button>
                </div>
            `;
            setTimeout(() => {
                const btn = userInfo.querySelector<HTMLButtonElement>("#userProfileBtn");
                if (btn) {
                    btn.addEventListener("click", () => {
                        navigate(`/profile`);
                    });
                }
            }, 0);
        } else {
            userInfo.innerHTML = `
                <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <span class="text-gray-400">NOT SIGNED IN</span>
                </div>
            `;
        }

        // Listen for auth changes
        const onAuthChanged = async () => {
            await fetchTournaments();
            render();
        };
        window.addEventListener("auth:changed", onAuthChanged);

        // Filter buttons (always enabled)
        root.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach(btn => {
            btn.onclick = async () => {
                const val = btn.getAttribute('data-filter');
                filter = val === "all" ? "all" : Number(val);
                await fetchTournaments();
                render();
            };
        });

        if (signedIn) {
            const create4Btn = root.querySelector<HTMLButtonElement>("#create4Btn");
            if (create4Btn) {
                create4Btn.onclick = async () => {
                    if (!user) {
                        alert("You must be logged in to create a tournament.");
                        return;
                    }

                    const response = await fetch(`${API_BASE}/tournaments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: 'include',
                        body: JSON.stringify({
                            creator: user.username,           // 👈 used as creatorName on backend
                            creatorId: Number(user.id),       // 👈 satisfies creator_id NOT NULL
                            size: 4,
                            name: `${user.username}'s Tournament`, // optional T_name-style label
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const tournamentId = data.id;
                        sessionStorage.setItem("currentTournamentSize", "4");
                        navigate(`/tournaments/waitingroom/${tournamentId}`);
                    } else {
                        await fetchTournaments();
                        render();
                    }
                };
            }

            const create8Btn = root.querySelector<HTMLButtonElement>("#create8Btn");
            if (create8Btn) {
                create8Btn.onclick = async () => {
                    if (!user) {
                        alert("You must be logged in to create a tournament.");
                        return;
                    }

                    const response = await fetch(`${API_BASE}/tournaments`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: 'include',
                        body: JSON.stringify({
                            creator: user.username,
                            creatorId: Number(user.id),
                            size: 8,
                            name: `${user.username}'s Tournament`,
                        }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const tournamentId = data.id;
                        sessionStorage.setItem("currentTournamentSize", "8");
                        navigate(`/tournaments/waitingroom/${tournamentId}`);
                    } else {
                        await fetchTournaments();
                        render();
                    }
                };
            }
        }

        // Create tournament buttons (only enabled if signed in)


        // Join button navigation (SPA-style)
        root.querySelectorAll<HTMLAnchorElement>('a.join-btn').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                const size = link.getAttribute('data-tournament-size');
                if (size) {
                    // Save tournament size before navigating
                    sessionStorage.setItem("currentTournamentSize", size);
                }
                if (href) navigate(href);
            });
        });

        // Add event listener for the back button
        const lobbyBtn = root.querySelector<HTMLButtonElement>("#backBtn");
        if (lobbyBtn) {
            lobbyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigate("/");
            });
        }

        // Add event listener for the bottom back button
        const lobbyBtnBottom = root.querySelector<HTMLButtonElement>("#backBtnBottom");
        if (lobbyBtnBottom) {
            lobbyBtnBottom.addEventListener('click', (e) => {
                e.preventDefault();
                navigate("/");
            });
        }

        // Add event listener for logout button
        const logoutBtn = root.querySelector<HTMLButtonElement>("#logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Clear all storage
                sessionStorage.clear();
                localStorage.clear();
                // Clear cookies
                document.cookie.split(";").forEach(c => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                // Trigger auth change event
                window.dispatchEvent(new CustomEvent("auth:changed"));
                // Redirect to home
                navigate("/");
            });
        }

        // Add event listener for login button
        const loginBtn = root.querySelector<HTMLButtonElement>("#loginBtn");
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Navigate to auth/login page
                navigate("/auth");
            });
        }

        // Clean up auth event listener on page leave
        return () => {
            window.removeEventListener("auth:changed", onAuthChanged);
        };
    }

    // Initial load
    fetchTournaments().then(render);
}