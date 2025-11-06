// import { getAuth, signOut } from "@/app/auth";
// import { navigate } from "@/app/router";

// export default function (root: HTMLElement, ctx?: { url?: URL }) {
//   const user = getAuth();
//   // If not logged in, redirect to auth with next param set to current path
//   const currentPath = ctx?.url?.pathname || "/profile";
//   if (!user) {
//     navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
//     return;
//   }

//   root.innerHTML = `
//     <section class="py-6 md:py-8 lg:py-10 space-y-4">
//       <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">Profile</h1>
//       <div class="rounded border p-4 space-y-2">
//         <p><span class="text-gray-500">Name:</span> <strong>${user.name}</strong></p>
//         <p><span class="text-gray-500">UserID:</span> <code class="text-xs">${user.id}</code></p>
//       </div>
//       <div class="flex gap-2">
//         <button id="logout" class="px-3 py-2 rounded bg-slate-700 text-white">Sign out</button>
//         <a href="/" class="px-3 py-2 rounded bg-blue-600 text-white">Go Lobby</a>
//         <button id="backBtn" class="px-3 py-2 rounded bg-gray-400 text-white">Go Back to tournament lobby</button>
//       </div>
//     </section>
//   `;

//   root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
//     await signOut();
//     // After logout, redirect to auth with next param set to current path
//     navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
//   });

// root.querySelector<HTMLButtonElement>("#backBtn")?.addEventListener("click", (e) => {
//   e.preventDefault();
//   navigate("/tournaments");
// });
// }
//------------------------------------------------------------------
import { getAuth, signOut } from "@/app/auth";
import { navigate } from "@/app/router";
import { writeDB, readDB } from "@/app/database";

export default function (root: HTMLElement) {
    const user = getAuth();
    
    if (!user) {
        navigate("/auth");
        return;
    }
    
    // Account löschen (Status auf 'deleted' setzen)
    async function deleteAccount() {
        if (!confirm("Möchten Sie Ihren Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
            return;
        }
        
        // Nutze die generische writeDB Funktion
        const result = await writeDB('Users', user.id, 'status', 'deleted');
        
        if (result.success) {
            alert("Ihr Account wurde als gelöscht markiert.");
            await signOut();
            navigate("/");
        } else {
            alert(`Fehler beim Löschen: ${result.error}`);
        }
    }
    
    // Beispiel: Email ändern
    async function updateEmail() {
        const newEmail = prompt("Neue E-Mail-Adresse eingeben:");
        if (!newEmail) return;
        
        const result = await writeDB('Users', user.id, 'email', newEmail);
        
        if (result.success) {
            alert("E-Mail erfolgreich aktualisiert!");
            // Optional: Seite neu laden oder State updaten
            location.reload();
        } else {
            alert(`Fehler beim Aktualisieren: ${result.error}`);
        }
    }
    
    // Beispiel: Bio/Beschreibung ändern
    async function updateBio() {
        const newBio = prompt("Neue Beschreibung eingeben:");
        if (newBio === null) return;
        
        const result = await writeDB('Users', user.id, 'bio', newBio);
        
        if (result.success) {
            alert("Beschreibung erfolgreich aktualisiert!");
            location.reload();
        } else {
            alert(`Fehler beim Aktualisieren: ${result.error}`);
        }
    }
    
    // User-Daten aus DB laden (optional)
    async function loadUserData() {
        const result = await readDB('Users', user.id, 'username,email,bio,status,created_at');
        
        if (result.success && result.data) {
            // Update UI mit den geladenen Daten
            const bioElement = root.querySelector("#userBio");
            if (bioElement && result.data.bio) {
                bioElement.textContent = result.data.bio;
            }
            
            const statusElement = root.querySelector("#userStatus");
            if (statusElement && result.data.status) {
                statusElement.textContent = result.data.status;
            }
        }
    }
    
    root.innerHTML = `
        <section class="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-950 py-6 px-4">
            <div class="max-w-3xl mx-auto">
                <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
                    <h1 class="text-4xl font-bold text-white mb-8">Mein Profil</h1>
                    
                    <!-- User Info -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="space-y-4">
                            <div class="bg-white/5 p-4 rounded-lg">
                                <span class="text-gray-400 text-sm">Benutzername</span>
                                <p class="text-white font-semibold text-lg">${user.username || user.name}</p>
                            </div>
                            
                            <div class="bg-white/5 p-4 rounded-lg">
                                <span class="text-gray-400 text-sm">E-Mail</span>
                                <p class="text-white font-semibold">${user.email}</p>
                                <button id="updateEmailBtn" class="mt-2 text-xs text-blue-400 hover:text-blue-300">
                                    ✏️ Ändern
                                </button>
                            </div>
                            
                            <div class="bg-white/5 p-4 rounded-lg">
                                <span class="text-gray-400 text-sm">Account ID</span>
                                <p class="text-white font-mono text-sm">${user.id}</p>
                            </div>
                        </div>
                        
                        <div class="space-y-4">
                            <div class="bg-white/5 p-4 rounded-lg">
                                <span class="text-gray-400 text-sm">Status</span>
                                <p id="userStatus" class="text-white font-semibold">Active</p>
                            </div>
                            
                            <div class="bg-white/5 p-4 rounded-lg">
                                <span class="text-gray-400 text-sm">Beschreibung</span>
                                <p id="userBio" class="text-white">${user.bio || 'Keine Beschreibung'}</p>
                                <button id="updateBioBtn" class="mt-2 text-xs text-blue-400 hover:text-blue-300">
                                    ✏️ Bearbeiten
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Danger Zone -->
                    <div class="border-t border-white/20 pt-6">
                        <h2 class="text-xl font-semibold text-red-400 mb-4">⚠️ Gefahrenzone</h2>
                        
                        <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                            <p class="text-gray-300 mb-4">
                                Das Löschen Ihres Accounts ist permanent und kann nicht rückgängig gemacht werden.
                            </p>
                            <button 
                                id="deleteAccountBtn"
                                class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-600/50"
                            >
                                🗑️ Account dauerhaft löschen
                            </button>
                        </div>
                    </div>
                    
                    <!-- Navigation -->
                    <div class="mt-8 flex gap-4">
                        <button 
                            id="backBtn"
                            class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors duration-200"
                        >
                            ← Zurück zur Lobby
                        </button>
                        
                        <button 
                            id="refreshBtn"
                            class="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200"
                        >
                            🔄 Daten neu laden
                        </button>
                    </div>
                </div>
            </div>
        </section>
    `;
    
    // Event Listeners
    const deleteBtn = root.querySelector<HTMLButtonElement>("#deleteAccountBtn");
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteAccount);
    }
    
    const backBtn = root.querySelector<HTMLButtonElement>("#backBtn");
    if (backBtn) {
        backBtn.addEventListener('click', () => navigate("/"));
    }
    
    const updateEmailBtn = root.querySelector<HTMLButtonElement>("#updateEmailBtn");
    if (updateEmailBtn) {
        updateEmailBtn.addEventListener('click', updateEmail);
    }
    
    const updateBioBtn = root.querySelector<HTMLButtonElement>("#updateBioBtn");
    if (updateBioBtn) {
        updateBioBtn.addEventListener('click', updateBio);
    }
    
    const refreshBtn = root.querySelector<HTMLButtonElement>("#refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUserData();
            alert("Daten wurden neu geladen!");
        });
    }
    
    // Initial load of user data
    loadUserData();
    
    // Cleanup
    return () => {
        // Cleanup if needed
    };
}