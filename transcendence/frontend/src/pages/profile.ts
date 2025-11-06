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

import { getAuth, signOut } from "@/app/auth";
import { navigate } from "@/app/router";

export default async function (root: HTMLElement) {
  const user = getAuth();
  
  if (!user) {
    navigate("/auth");
    return;
  }

  // Erst Session-Daten zeigen
  root.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Lade erweiterte Profildaten...</h1>
      <div class="animate-pulse bg-gray-200 h-32 rounded"></div>
    </div>
  `;

  try {
    const token = JSON.parse(sessionStorage.getItem("ft_transcendence_version1") || "{}").auth?.token;
      
      const dbResponse = await fetch(`/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    const dbData = await dbResponse.json();
    
    console.log("Datenbank Antwort:", dbData);
    
    // Kombiniere Session + DB Daten
    const fullProfile = dbData.success && dbData.data?.[0] 
      ? { ...user, ...dbData.data[0] }  // Merge beide Datenquellen
      : user;  // Fallback zu Session-Daten

    root.innerHTML = `
      <section class="py-8 max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold mb-6">Mein erweitertes Profil</h1>
        
        <!-- Session Daten (immer verfügbar) -->
        <div class="bg-blue-50 rounded-lg p-6 mb-4">
          <h2 class="text-lg font-semibold mb-3">📱 Session Daten:</h2>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Username:</strong> ${user.username}</p>
          <p><strong>ID:</strong> ${user.id}</p>
        </div>

        <!-- Datenbank Daten (wenn verfügbar) -->
        ${dbData.success ? `
          <div class="bg-green-50 rounded-lg p-6 mb-4">
            <h2 class="text-lg font-semibold mb-3">💾 Datenbank Daten:</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Display Name:</p>
                <p class="font-semibold">${fullProfile.display_name || 'Nicht gesetzt'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Bio:</p>
                <p class="font-semibold">${fullProfile.bio || 'Keine Bio'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Avatar:</p>
                <p class="font-semibold">${fullProfile.avatar || 'Kein Avatar'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Status:</p>
                <p class="font-semibold">${fullProfile.status || 'offline'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Registriert:</p>
                <p class="font-semibold">${fullProfile.created_at || 'Unbekannt'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Letzter Login:</p>
                <p class="font-semibold">${fullProfile.last_login || 'Nie'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">MFA aktiviert:</p>
                <p class="font-semibold">${fullProfile.mfa_enabled ? '✅ Ja' : '❌ Nein'}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Gast Account:</p>
                <p class="font-semibold">${fullProfile.is_guest ? 'Ja' : 'Nein'}</p>
              </div>
            </div>
          </div>
        ` : `
          <div class="bg-yellow-50 rounded-lg p-6 mb-4">
            <p>⚠️ Keine erweiterten Daten aus DB verfügbar</p>
          </div>
        `}

        <!-- Buttons -->
        <div class="flex gap-3">
          <button id="refresh" class="px-4 py-2 bg-blue-600 text-white rounded">
            🔄 Aktualisieren
          </button>
          <button id="logout" class="px-4 py-2 bg-red-600 text-white rounded">
            🚪 Logout
          </button>
        </div>

        <!-- Debug Info -->
        <details class="mt-6 p-4 bg-gray-100 rounded">
          <summary class="cursor-pointer font-semibold">🔍 Debug Info</summary>
          <pre class="text-xs mt-4">${JSON.stringify({
            session: user,
            database: dbData
          }, null, 2)}</pre>
        </details>
      </section>
    `;

    // Event Listeners
    document.getElementById('refresh')?.addEventListener('click', () => {
      window.location.reload();
    });

    document.getElementById('logout')?.addEventListener('click', async () => {
      await signOut();
      navigate("/auth");
    });

  } catch (error) {
    console.error("Fehler beim DB-Abruf:", error);
    // Zeige trotzdem Session-Daten
  }
}