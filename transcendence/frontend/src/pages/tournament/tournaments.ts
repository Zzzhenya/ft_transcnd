
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { navigate } from "@/app/router";

export default function (root: HTMLElement) {
    let tournaments: any[] = [];
    let filter: number | "all" = "all";

    // Clean up tournament-specific data when returning to lobby
    sessionStorage.removeItem("currentTournamentSize");
    sessionStorage.removeItem("currentTournamentId");
    sessionStorage.removeItem("tournamentPlayers");
    sessionStorage.removeItem("tournamentLocalPlayers");
    sessionStorage.removeItem("tournamentPlayerTypes");

    async function fetchTournaments() {
        const res = await fetch("http://localhost:3000/tournaments");
        const data = await res.json();
        tournaments = data.tournaments || [];
    }

    async function render() {
        const user = getAuth();
        const state = getState();
        const signedIn = !!user;
        const isGuest = !user && !!state.session.alias;

        root.innerHTML = `
        <section class="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-6 px-4">
            <div class="max-w-6xl mx-auto">
                
                <!-- Header -->
                <div class="text-center mb-6">
                    <div class="text-5xl mb-2 filter drop-shadow-2xl">🏆</div>
                    <h1 class="text-4xl font-black text-white mb-3 tracking-tight">
                        TOURNAMENT
                    </h1>
                    <div id="userInfo" class="flex justify-center"></div>
                </div>

                <!-- Filter Tabs -->
                <div class="flex justify-center gap-2 mb-4">
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-bold transition-all ${filter === "all" ? "bg-white text-blue-900" : "bg-white/10 text-white hover:bg-white/20"}" data-filter="all">
                        ALL
                    </button>
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-bold transition-all ${filter === 4 ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}" data-filter="4">
                        4P
                    </button>
                    <button class="filter-btn px-6 py-2 rounded-full text-sm font-bold transition-all ${filter === 8 ? "bg-gradient-to-r from-orange-500 to-pink-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}" data-filter="8">
                        8P
                    </button>
                </div>

                <!-- Tournaments Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    ${
                        tournaments.filter(t => filter === "all" || t.size === filter).length > 0
                        ? tournaments
                            .filter(t => filter === "all" || t.size === filter)
                            .map(t => `
                                <div class="group relative bg-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-300">
                                    <div class="absolute top-3 right-3">
                                        <div class="w-10 h-10 rounded-full bg-gradient-to-br ${t.size === 4 ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-pink-600'} flex items-center justify-center text-white font-black shadow-lg">
                                            ${t.size}
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <div class="text-purple-300 font-mono text-xs mb-1">TOURNAMENT #${t.id}</div>
                                        <div class="text-2xl font-black text-white mb-1">${t.size} PLAYERS</div>
                                        <div class="flex items-center gap-2 text-sm text-gray-300">
                                            <span>👥</span>
                                            <span class="font-bold">${t.playerSet ? Array.from(t.playerSet).length : (t.players || 0)} / ${t.size}</span>
                                            <span class="text-gray-500 text-xs">joined</span>
                                        </div>
                                    </div>
                                    <a href="/tournaments/waitingroom/${t.id}" data-tournament-size="${t.size}" class="join-btn block w-full py-3 rounded-xl bg-white text-gray-900 font-black text-center hover:bg-gray-100 transition-all transform hover:scale-105 ${(!signedIn && !isGuest) ? "opacity-30 pointer-events-none" : ""}">
                                        JOIN NOW →
                                    </a>
                                </div>
                            `).join('')
                        : `<div class="col-span-2 text-center py-12">
                                <div class="text-6xl mb-3 opacity-20">🎯</div>
                                <div class="text-xl text-white/40 font-bold">NO ACTIVE TOURNAMENTS</div>
                            </div>`
                    }
                </div>

                <!-- Create Buttons -->
                <div class="flex flex-col sm:flex-row justify-center gap-3 mb-6">
                    <button id="create4Btn" class="group px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black transition-all transform hover:scale-105 shadow-xl hover:shadow-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none" ${(!signedIn && !isGuest) ? "disabled" : ""}>
                        <div class="flex items-center justify-center gap-2">
                            <span class="text-2xl">🎮</span>
                            <span>CREATE 4P</span>
                        </div>
                    </button>
                    <button id="create8Btn" class="group px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-400 hover:to-pink-500 text-white font-black transition-all transform hover:scale-105 shadow-xl hover:shadow-pink-500/50 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none" ${(!signedIn && !isGuest) ? "disabled" : ""}>
                        <div class="flex items-center justify-center gap-2">
                            <span class="text-2xl">🔥</span>
                            <span>CREATE 8P</span>
                        </div>
                    </button>
                </div>

                <!-- Back Button -->
                <div class="flex justify-center">
                    <button id="backBtn" class="px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-bold hover:bg-white/20 transition-all">
                        ← BACK
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
                    <span class="text-white font-bold">${user.name}</span>
                </div>
            `;
        } else if (isGuest) {
            userInfo.innerHTML = `
                <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                    <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    <span class="text-white font-bold">${state.session.alias}</span>
                    <span class="text-xs text-gray-400">GUEST</span>
                </div>
            `;
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

        // Create tournament buttons (only enabled if signed in or guest)
        if (signedIn || isGuest) {
            const create4Btn = root.querySelector<HTMLButtonElement>("#create4Btn");
            if (create4Btn) {
                create4Btn.onclick = async () => {
                    const creator = user ? user.name : state.session.alias;
                    // Backend will generate the tournament ID
                    const response = await fetch("http://localhost:3000/tournaments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ creator, size: 4 })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const tournamentId = data.id;
                        // Save size to sessionStorage before navigating
                        sessionStorage.setItem("currentTournamentSize", "4");
                        // Navigate to the waiting room
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
                    const creator = user ? user.name : state.session.alias;
                    // Backend will generate the tournament ID
                    const response = await fetch("http://localhost:3000/tournaments", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ creator, size: 8 })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        const tournamentId = data.id;
                        // Save size to sessionStorage before navigating
                        sessionStorage.setItem("currentTournamentSize", "8");
                        // Navigate to the waiting room
                        navigate(`/tournaments/waitingroom/${tournamentId}`);
                    } else {
                        await fetchTournaments();
                        render();
                    }
                };
            }
        }

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

        // Clean up auth event listener on page leave
        return () => {
            window.removeEventListener("auth:changed", onAuthChanged);
        };
    }

    // Initial load
    fetchTournaments().then(render);
}