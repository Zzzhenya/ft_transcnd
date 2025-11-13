// // frontend/src/pages/dashboard.ts
// import { getAuth } from "@/app/auth";
// import { navigate } from "@/app/router";

// export default function (root: HTMLElement, ctx?: { url?: URL }) {
//   const user = getAuth();
//   const currentPath = ctx?.url?.pathname || "/dashboard";
  
//   if (!user) {
//     navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
//     return;
//   }

//   root.innerHTML = `
//     <section class="py-6 md:py-8 lg:py-10 space-y-6">
//       <div class="flex items-center justify-between">
//         <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">📊 Dashboard</h1>
//       </div>

//       <!-- Dashboard Content -->
//       <div class="bg-white rounded-lg shadow-lg p-6">
//         <h2 class="text-xl font-bold mb-4">Welcome to your Dashboard!</h2>
//         <p class="text-gray-600 mb-6">
//           Dashboard content will be displayed here.
//         </p>
//       </div>

//       <!-- Navigation -->
//       <div class="flex gap-3">
//         <button id="back-to-profile-btn" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
//           👤 Back to Profile
//         </button>
//       </div>
//     </section>
//   `;

//   // Event Listeners
//   root.querySelector<HTMLButtonElement>("#back-to-profile-btn")?.addEventListener("click", (e) => {
//     e.preventDefault();
//     navigate("/profile");
//   });
// }

// frontend/src/pages/dashboard.ts
import { getAuth } from "@/app/auth";
import { navigate } from "@/app/router";

interface RemoteMatch {
  id: number;
  opponentId: number;
  opponentName: string;
  opponentUserName: string;
  userScore: number;
  opponentScore: number;
  result: 'won' | 'lost' | 'draw';
  finishedAt: string;
}

export default function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  const currentPath = ctx?.url?.pathname || "/dashboard";
  
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">📊 Dashboard</h1>
      </div>

      <!-- Remote Match History -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-bold mb-4">🎮 Remote Match History</h2>
        
        <!-- Loading State -->
        <div id="matches-loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading matches...</p>
        </div>

        <!-- Error State -->
        <div id="matches-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">❌ Failed to load match history</p>
        </div>

        <!-- Empty State -->
        <div id="matches-empty" class="hidden text-center py-8 text-gray-500">
          <p class="text-lg">No matches played yet</p>
          <p class="text-sm mt-2">Your remote match history will appear here</p>
        </div>

        <!-- Matches Table -->
        <div id="matches-container" class="hidden overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Match #
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opponent Alias
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opponent Username
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody id="matches-tbody" class="bg-white divide-y divide-gray-200">
              <!-- Matches will be inserted here -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button id="back-to-profile-btn" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          👤 Back to Profile
        </button>
      </div>
    </section>
  `;

  // Event Listeners
  root.querySelector<HTMLButtonElement>("#back-to-profile-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/profile");
  });

  // Load Remote Matches
  loadRemoteMatches(user.id);
}

async function loadRemoteMatches(userId: number) {
  const loadingEl = document.getElementById('matches-loading');
  const errorEl = document.getElementById('matches-error');
  const emptyEl = document.getElementById('matches-empty');
  const containerEl = document.getElementById('matches-container');
  const tbodyEl = document.getElementById('matches-tbody');

  try {
    // ✅ RICHTIG: Verwende getToken() statt localStorage
    const { getToken } = await import('@/app/auth');
    const token = getToken();
    
    if (!token) {
      console.error('❌ No token found!');
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/user-service/users/${userId}/remote-matches`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const matches: RemoteMatch[] = data.matches || [];

    // Hide loading
    loadingEl?.classList.add('hidden');

    if (matches.length === 0) {
      // Show empty state
      emptyEl?.classList.remove('hidden');
      return;
    }

    // Show matches table
    containerEl?.classList.remove('hidden');

    // Render matches
    if (tbodyEl) {
      tbodyEl.innerHTML = matches.map(match => {
        const resultBadge = getResultBadge(match.result);
        const date = formatDate(match.finishedAt);
        
        return `
          <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              #${match.id}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${match.opponentName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${match.opponentUserName}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              <span class="font-semibold">${match.userScore}</span> - <span class="font-semibold">${match.opponentScore}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              ${resultBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${date}
            </td>
          </tr>
        `;
      }).join('');
    }

  } catch (error) {
    console.error('Failed to load remote matches:', error);
    loadingEl?.classList.add('hidden');
    errorEl?.classList.remove('hidden');
  }
}

function getResultBadge(result: 'won' | 'lost' | 'draw'): string {
  switch (result) {
    case 'won':
      return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Victory</span>';
    case 'lost':
      return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Defeat</span>';
    case 'draw':
      return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">− Draw</span>';
    default:
      return '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">?</span>';
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}