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
import { getAuth, signOut, getProfile } from "@/app/auth";
import { navigate } from "@/app/router";

export default async function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  const currentPath = ctx?.url?.pathname || "/profile";
  
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  // Funktion zum Formatieren von Timestamps
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Nicht verfügbar';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status-Badge Farbe bestimmen
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'in_game': return 'bg-yellow-500';
      case 'away': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };
//
  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
        👤 Mein Profil
      </h1>
      
      <!-- Haupt-Profilkarte -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <!-- Header mit Avatar und Status -->
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
          <div class="flex items-center space-x-4">
            <!-- Avatar -->
            <div class="relative">
              ${user.avatar ? 
                `<img src="${user.avatar}" alt="Avatar" class="w-24 h-24 rounded-full border-4 border-white">` :
                `<div class="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-4 border-white">
                  <span class="text-3xl">👤</span>
                </div>`
              }
              <!-- Status Indicator -->
              <div class="absolute bottom-0 right-0 w-6 h-6 ${getStatusColor(user.status || 'offline')} rounded-full border-2 border-white"></div>
            </div>
            
            <!-- Name und Display Name -->
            <div class="text-white">
              <h2 class="text-2xl font-bold">
                ${user.display_name || user.username || user.name}
              </h2>
              <p class="text-blue-100">
                @${user.username || user.name}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Profil-Inhalt -->
        <div class="p-6 space-y-6">
          <!-- Bio Section -->
          ${user.bio ? `
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Über mich
            </h3>
            <p class="text-gray-900 dark:text-white">
              ${user.bio}
            </p>
          </div>
          ` : `
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Über mich
            </h3>
            <p class="text-gray-500 dark:text-gray-400 italic">
              Noch keine Bio hinzugefügt
            </p>
            <button id="addBio" class="mt-2 text-sm text-blue-600 hover:text-blue-800">
              + Bio hinzufügen
            </button>
          </div>
          `}
          
          <!-- Kontakt-Informationen -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Kontakt-Informationen
            </h3>
            <div class="grid gap-3">
              <!-- E-Mail -->
              <div class="flex items-center space-x-3">
                <span class="text-2xl">📧</span>
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">E-Mail</p>
                  <p class="text-gray-900 dark:text-white font-medium">
                    ${user.email}
                  </p>
                </div>
              </div>
              
              <!-- User ID -->
              <div class="flex items-center space-x-3">
                <span class="text-2xl">🆔</span>
                <div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">User ID</p>
                  <code class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    ${user.id}
                  </code>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Account-Details -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              Account-Details
            </h3>
            <div class="grid gap-3">
              <!-- Status -->
              <div class="flex justify-between items-center">
                <span class="text-gray-500 dark:text-gray-400">Status:</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.status === 'online' ? 'bg-green-100 text-green-800' :
                  user.status === 'in_game' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }">
                  ${user.status || 'offline'}
                </span>
              </div>
              
              <!-- Rolle -->
              ${user.role ? `
              <div class="flex justify-between items-center">
                <span class="text-gray-500 dark:text-gray-400">Rolle:</span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                  ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}">
                  ${user.role}
                </span>
              </div>
              ` : ''}
              
              <!-- Registriert seit -->
              Registiert seit ?do
              ${user.created_at ? `
              <div class="flex justify-between items-center">
                <span class="text-gray-500 dark:text-gray-400">Registriert seit:</span>
                <span class="text-gray-900 dark:text-white">
                  ${formatDate(user.created_at)}
                </span>
              </div>
              ` : ''}
              
              <!-- Letzter Login -->
              ${user.last_login ? `
              <div class="flex justify-between items-center">
                <span class="text-gray-500 dark:text-gray-400">Letzter Login:</span>
                <span class="text-gray-900 dark:text-white">
                  ${formatDate(user.last_login)}
                </span>
              </div>
              ` : ''}
              
              <!-- 2FA Status -->
              ${user.mfa_enabled !== undefined ? `
              <div class="flex justify-between items-center">
                <span class="text-gray-500 dark:text-gray-400">Zwei-Faktor-Auth:</span>
                <span class="inline-flex items-center">
                  ${user.mfa_enabled ? 
                    '<span class="text-green-600">✅ Aktiviert</span>' : 
                    '<span class="text-gray-500">❌ Deaktiviert</span>'
                  }
                </span>
              </div>
              ` : ''}
            </div>
          </div>
          
          <!-- Profil bearbeiten Button -->
          <div class="border-t pt-4">
            <button id="editProfile" class="w-full sm:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
              ✏️ Profil bearbeiten
            </button>
          </div>
        </div>
      </div>
      
      <!-- Aktions-Buttons -->
      <div class="flex flex-wrap gap-3">
        <button id="logout" class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition">
          🚪 Logout
        </button>
        <a href="/" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition">
          🎮 Lobby
        </a>
        <button id="backBtn" class="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white transition">
          🏆 Tournament
        </button>
        <button id="refreshProfile" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition">
          🔄 Aktualisieren
        </button>
      </div>
      
      <!-- Status-Meldungen -->
      <div id="statusMessage" class="hidden"></div>
    </section>
  `;

  // Event Listeners
  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    const statusDiv = root.querySelector<HTMLDivElement>("#statusMessage");
    if (statusDiv) {
      statusDiv.className = "p-3 rounded-lg bg-yellow-100 text-yellow-800";
      statusDiv.textContent = "Melde ab...";
      statusDiv.classList.remove("hidden");
    }
    
    await signOut();
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    window.location.reload();
  });

  root.querySelector<HTMLButtonElement>("#backBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/tournaments");
    window.location.reload();
  });

  root.querySelector<HTMLButtonElement>("#editProfile")?.addEventListener("click", () => {
    // TODO: Navigate to edit profile page
    alert("Profil-Bearbeitung kommt bald!");
  });

  root.querySelector<HTMLButtonElement>("#addBio")?.addEventListener("click", () => {
    // TODO: Open bio editor
    alert("Bio-Editor kommt bald!");
  });

  root.querySelector<HTMLButtonElement>("#refreshProfile")?.addEventListener("click", async () => {
    const statusDiv = root.querySelector<HTMLDivElement>("#statusMessage");
    
    try {
      if (statusDiv) {
        statusDiv.className = "p-3 rounded-lg bg-blue-100 text-blue-800";
        statusDiv.textContent = "Lade aktuelle Profildaten...";
        statusDiv.classList.remove("hidden");
      }
      
      const result = await getProfile();
      
      if (result.success && result.user) {
        const s = JSON.parse(sessionStorage.getItem("ft_transcendence_version1") || "{}");
        if (!s.auth) s.auth = { user: null, token: null };
        s.auth.user = result.user;
        sessionStorage.setItem("ft_transcendence_version1", JSON.stringify(s));
        
        window.location.reload();
      } else {
        if (statusDiv) {
          statusDiv.className = "p-3 rounded-lg bg-red-100 text-red-800";
          statusDiv.textContent = result.error || "Fehler beim Laden der Profildaten";
          setTimeout(() => statusDiv.classList.add("hidden"), 3000);
        }
      }
    } catch (error) {
      if (statusDiv) {
        statusDiv.className = "p-3 rounded-lg bg-red-100 text-red-800";
        statusDiv.textContent = "Netzwerkfehler beim Laden der Profildaten";
        setTimeout(() => statusDiv.classList.add("hidden"), 3000);
      }
    }
  });
}