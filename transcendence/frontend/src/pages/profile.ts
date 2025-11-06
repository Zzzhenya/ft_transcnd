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

  // Zeige erst Session-Daten
  root.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Lade Profildaten...</h1>
    </div>
  `;

  try {
    // Hole erweiterte Daten über die EXISTIERENDE auth/profile Route!
    const token = JSON.parse(sessionStorage.getItem("ft_transcendence_version1") || "{}").auth?.token;
    
    const response = await fetch(`/api/auth/profile-full/${user.id}`,{
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profileData = await response.json();
    console.log("Profile Response:", profileData); // Debug
    
    // Kombiniere Session + DB Daten
    const fullProfile = profileData.success && profileData.user 
      ? { ...user, ...profileData.user }
      : user;

    // Format Datum
    const formatDate = (dateString) => {
      if (!dateString) return 'Unbekannt';
      return new Date(dateString).toLocaleDateString('de-DE');
    };

    root.innerHTML = `
      <section class="py-8 max-w-4xl mx-auto px-4">
        <h1 class="text-3xl font-bold mb-6">Mein Profil</h1>
        
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-2xl font-bold mb-4">${fullProfile.username}</h2>
          
          <div class="bg-blue-50 p-4 rounded mb-4">
            <p class="text-gray-600">E-Mail:</p>
            <p class="text-xl font-semibold">${fullProfile.email}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-gray-600">User ID:</p>
              <p class="font-semibold">${fullProfile.id}</p>
            </div>
            <div>
              <p class="text-gray-600">Username:</p>
              <p class="font-semibold">${fullProfile.username}</p>
            </div>
            <div>
              <p class="text-gray-600">role:</p>
              <p class="font-semibold">${fullProfile.role}</p>
            </div>
            <div>
              <p class="text-gray-600">Registriert seit:</p>
              <p class="font-semibold">${fullProfile.created_at}</p>
            </div>
            <div>
              <p class="text-gray-600">Letzter Login:</p>
              <p class="font-semibold">${formatDate(fullProfile.last_login)}</p>
            </div>
          </div>
        </div>
        
        <button id="logout" class="mt-4 px-4 py-2 bg-red-600 text-white rounded">
          Logout
        </button>
        
        <!-- Debug -->
        <details class="mt-4 p-4 bg-gray-100 rounded">
          <summary>Debug Info</summary>
          <pre class="text-xs">${JSON.stringify(fullProfile, null, 2)}</pre>
        </details>
      </section>
    `;
    
    document.getElementById('logout')?.addEventListener('click', async () => {
      await signOut();
      navigate("/auth");
    });
    
  } catch (error) {
    console.error("Error:", error);
    // Fallback zu Session-Daten
    root.innerHTML = `<div class="p-8">Fehler: ${error.message}</div>`;
  }
}