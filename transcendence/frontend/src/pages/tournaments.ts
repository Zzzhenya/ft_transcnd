import { getAuth, signOut } from "@/app/auth";
import { getState } from "@/app/store";
import { navigate } from "@/app/router";
export default function (root: HTMLElement) {
    let tournaments = [
        { id: 1201, players: 2, max: 4 },
        { id: 1202, players: 3, max: 4 },
        { id: 1301, players: 1, max: 8 },
    ];
    let filter: number | "all" = "all";

    function render() {
        const user = getAuth();
        const state = getState();
        const signedIn = !!user;
        const isGuest = !user && !!state.session.alias;

        root.innerHTML = `
        <section class="py-8 max-w-xl mx-auto space-y-6">
            <div id="userInfo" class="mb-4"></div>
            <div class="mb-4 flex gap-2 justify-end">
                <span id="authNav"></span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-center mb-4">Tournament Lobby</h1>
            <p class="text-center text-gray-700 mb-4">
                Sign in as a real user or as a guest (alias) to join or create tournaments.
                ${!signedIn && !isGuest ? `<br><span class="text-red-600 font-semibold">Please sign in first to join or create a tournament.</span>` : ""}
            </p>
            <div class="flex justify-center gap-4 mb-4">
                <button class="filter-btn px-4 py-2 rounded ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200"}" data-filter="all">All</button>
                <button class="filter-btn px-4 py-2 rounded ${filter === 4 ? "bg-blue-600 text-white" : "bg-gray-200"}" data-filter="4">4 Players</button>
                <button class="filter-btn px-4 py-2 rounded ${filter === 8 ? "bg-blue-600 text-white" : "bg-gray-200"}" data-filter="8">8 Players</button>
            </div>
            <div class="rounded-xl border bg-white shadow p-4 space-y-4">
                <h2 class="font-semibold text-lg mb-2">Available Tournaments:</h2>
                <div class="space-y-2">
                    ${
                        tournaments.filter(t => filter === "all" || t.max === filter).length > 0
                        ? tournaments
                            .filter(t => filter === "all" || t.max === filter)
                            .map(t => `
                                <div class="flex items-center justify-between border rounded p-3">
                                    <span class="font-mono">#${t.id}</span>
                                    <span class="text-gray-600">Players: ${t.players}/${t.max}</span>
                                    <a href="/tournaments/${t.id}" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition ${(!signedIn && !isGuest) ? "opacity-50 pointer-events-none" : ""}">Join</a>
                                </div>
                            `).join('')
                        : `<div class="text-gray-500 text-center">(No tournament available?)</div>`
                    }
                </div>
                <div class="flex justify-center gap-4 mt-4">
                    <button id="create4Btn" class="px-5 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition font-semibold" ${(!signedIn && !isGuest) ? "disabled" : ""}>Create 4 Player Tournament</button>
                    <button id="create8Btn" class="px-5 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold" ${(!signedIn && !isGuest) ? "disabled" : ""}>Create 8 Player Tournament</button>
                </div>
            </div>
            <div class="flex justify-center mt-6">
                <button id="backBtn" class="px-4 py-2 rounded bg-gray-400 text-white">← Back to Main Lobby</button>
            </div>
        </section>
        `;

        // --- User/Guest info section ---
        const userInfo = root.querySelector<HTMLElement>("#userInfo")!;
        if (user) {
            userInfo.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-green-600">●</span>
                    <span class="font-medium">Logged in as ${user.name}</span>
                    <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Registered</span>
                </div>
            `;
        } else if (isGuest) {
            userInfo.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-blue-600">●</span>
                    <span class="font-medium">Playing as ${state.session.alias}</span>
                    <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Guest</span>
                </div>
            `;
        } else {
            userInfo.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="text-gray-400">●</span>
                    <span class="text-gray-600">Not signed in</span>
                    <a href="/auth" class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Sign in or play as guest</a>
                </div>
            `;
        }

        // Auth-aware nav
        const authNav = root.querySelector<HTMLElement>("#authNav")!;
        function renderAuthNav() {
            const user = getAuth();
            authNav.innerHTML = user
                ? `
                    <span class="px-3 py-2 rounded bg-green-100 text-green-700 font-semibold">Signed in as ${user.name || "User"}</span>
                    <button id="logout" class="px-3 py-2 rounded bg-slate-600 text-white font-semibold">Sign out</button>
                  `
                : `
                    <a href="/auth" class="px-3 py-2 rounded bg-blue-600 text-white font-semibold">Sign In</a>
                  `;
           
            authNav.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async (e) => {
                 e.preventDefault();
                 await signOut();
                 render();// Re-render nav to show "Sign In" button
            });
        }
        renderAuthNav();

        // Listen for auth changes
        const onAuthChanged = () => {
            render();
        };
        window.addEventListener("auth:changed", onAuthChanged);

        // Filter buttons (always enabled)
        root.querySelectorAll<HTMLButtonElement>('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                const val = btn.getAttribute('data-filter');
                filter = val === "all" ? "all" : Number(val);
                render();
            };
        });

        // Create tournament buttons (only enabled if signed in or guest)
        if (signedIn || isGuest) {
            const create4Btn = root.querySelector<HTMLButtonElement>("#create4Btn");
            if (create4Btn) {
                create4Btn.onclick = () => {
                    const newId = Math.max(0, ...tournaments.map(t => t.id)) + 1;
                    tournaments.push({ id: newId, players: 1, max: 4 });
                    render();
                };
            }
            const create8Btn = root.querySelector<HTMLButtonElement>("#create8Btn");
            if (create8Btn) {
                create8Btn.onclick = () => {
                    const newId = Math.max(0, ...tournaments.map(t => t.id)) + 1;
                    tournaments.push({ id: newId, players: 1, max: 8 });
                    render();
                };
            }
        }

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

    render();
}