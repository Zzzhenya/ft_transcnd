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

interface TournamentParticipation {
  tournamentId: number;
  joinedAt: string;
}

interface TournamentMatch {
  id: number;
  round: number;
  matchNumber: number;
  player1: { id: number; name: string };
  player2: { id: number; name: string };
  winner: { id: number; name: string } | null;
  score: { player1: number; player2: number };
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
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
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">📊 Dashboard ${user.username} </h1>
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
                <!--
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opponent Username
                </th>
                -->
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

      <!-- Tournament History -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-xl font-bold mb-4">🏆 Tournament History</h2>
        
        <!-- Loading State -->
        <div id="tournaments-loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading tournaments...</p>
        </div>

        <!-- Error State -->
        <div id="tournaments-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-600">❌ Failed to load tournament history</p>
        </div>

        <!-- Empty State -->
        <div id="tournaments-empty" class="hidden text-center py-8 text-gray-500">
          <p class="text-lg">No tournaments played yet</p>
          <p class="text-sm mt-2">Your tournament participation will appear here</p>
        </div>

        <!-- Tournaments List -->
        <div id="tournaments-container" class="hidden">
          <ul id="tournaments-list" class="space-y-2">
            <!-- Tournaments will be inserted here -->
          </ul>
        </div>
      </div>



      <!-- Navigation -->
      <div class="flex gap-3">
        <button id="back-to-profile-btn" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          👤 Back to Profile
        </button>
      </div>

      <!-- Tournament Matches Modal -->
      <div id="tournament-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-6 border-b">
            <h3 id="modal-title" class="text-2xl font-bold">🏆 Tournament Matches</h3>
            <button id="close-modal" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
          </div>
          
          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- Loading State -->
            <div id="modal-loading" class="text-center py-8">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p class="mt-4 text-gray-600">Loading matches...</p>
            </div>

            <!-- Error State -->
            <div id="modal-error" class="hidden bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-600">❌ Failed to load matches</p>
            </div>

            <!-- Matches Content -->
            <div id="modal-content" class="hidden space-y-4">
              <!-- Matches will be inserted here -->
            </div>
          </div>
        </div>
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

  loadTournaments(user.id);

  setupModalHandlers();
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
            <!--
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${match.opponentUserName}
            </td>
            -->
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

async function loadTournaments(userId: number) {
  const loadingEl = document.getElementById('tournaments-loading');
  const errorEl = document.getElementById('tournaments-error');
  const emptyEl = document.getElementById('tournaments-empty');
  const containerEl = document.getElementById('tournaments-container');
  const listEl = document.getElementById('tournaments-list');

  try {
    const { getToken } = await import('@/app/auth');
    const token = getToken();
    
    if (!token) {
      console.error('❌ No token found!');
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/user-service/users/${userId}/tournaments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const tournaments: TournamentParticipation[] = data.tournaments || [];

    // Hide loading
    loadingEl?.classList.add('hidden');

    if (tournaments.length === 0) {
      // Show empty state
      emptyEl?.classList.remove('hidden');
      return;
    }

    // Show tournaments list
    containerEl?.classList.remove('hidden');

    // Render tournaments
    if (listEl) {
      listEl.innerHTML = tournaments.map(tournament => {
        return `
          <li class="tournament-item flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              data-tournament-id="${tournament.tournamentId}">
            <span class="text-2xl">🏆</span>
            <span class="text-sm font-medium text-gray-900">Tournament #${tournament.tournamentId}</span>
          </li>
        `;
      }).join('');

      // Event listeners hinzufügen
      document.querySelectorAll('.tournament-item').forEach(item => {
        item.addEventListener('click', () => {
          const tournamentId = item.getAttribute('data-tournament-id');
          if (tournamentId) {
            openTournamentModal(parseInt(tournamentId));
          }
        });
      });
    }

  } catch (error) {
    console.error('Failed to load tournaments:', error);
    loadingEl?.classList.add('hidden');
    errorEl?.classList.remove('hidden');
  }
}

async function openTournamentModal(tournamentId: number) {
  const modal = document.getElementById('tournament-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalLoading = document.getElementById('modal-loading');
  const modalError = document.getElementById('modal-error');
  const modalContent = document.getElementById('modal-content');

  // Show modal
  modal?.classList.remove('hidden');
  
  // Update title
  if (modalTitle) {
    modalTitle.textContent = `🏆 Tournament #${tournamentId} Matches`;
  }

  // Reset states
  modalLoading?.classList.remove('hidden');
  modalError?.classList.add('hidden');
  modalContent?.classList.add('hidden');

  try {
    const { getToken } = await import('@/app/auth');
    const token = getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/user-service/tournaments/${tournamentId}/matches`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const matches: TournamentMatch[] = data.matches || [];

    // Hide loading
    modalLoading?.classList.add('hidden');

    if (matches.length === 0) {
      if (modalContent) {
        modalContent.innerHTML = '<p class="text-center text-gray-500">No matches found</p>';
      }
      modalContent?.classList.remove('hidden');
      return;
    }

    // Show matches
    modalContent?.classList.remove('hidden');

    // Group matches by round
    const matchesByRound: { [key: number]: TournamentMatch[] } = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });

    // Render matches by round
    if (modalContent) {
      modalContent.innerHTML = Object.entries(matchesByRound)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([round, roundMatches]) => {
          return `
            <div class="space-y-3">
              <h4 class="text-lg font-semibold text-gray-700 border-b pb-2">Round ${round}</h4>
              ${roundMatches.map(match => {
                const isFinished = match.status === 'finished';
                const winnerName = match.winner?.name || '-';
                
                return `
                  <div class="bg-gray-50 rounded-lg p-4 border ${isFinished ? 'border-gray-200' : 'border-blue-300'}">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-medium text-gray-500">Match #${match.matchNumber}</span>
                      <span class="text-xs px-2 py-1 rounded ${isFinished ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}">
                        ${match.status}
                      </span>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4 items-center">
                      <!-- Player 1 -->
                      <div class="text-right">
                        <p class="font-semibold ${match.winner?.id === match.player1.id ? 'text-green-600' : 'text-gray-900'}">
                          ${match.player1.name}
                        </p>
                      </div>
                      
                      <!-- Score -->
                      <div class="text-center">
                        <p class="text-2xl font-bold text-gray-900">
                          ${match.score.player1 || 0} : ${match.score.player2 || 0}
                        </p>
                      </div>
                      
                      <!-- Player 2 -->
                      <div class="text-left">
                        <p class="font-semibold ${match.winner?.id === match.player2.id ? 'text-green-600' : 'text-gray-900'}">
                          ${match.player2.name}
                        </p>
                      </div>
                    </div>
                    
                    ${isFinished ? `
                      <div class="mt-2 text-center">
                        <p class="text-xs text-gray-600">Winner: <span class="font-semibold text-green-600">${winnerName}</span></p>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('');
    }

  } catch (error) {
    console.error('Failed to load tournament matches:', error);
    modalLoading?.classList.add('hidden');
    modalError?.classList.remove('hidden');
  }
}

function setupModalHandlers() {
  const modal = document.getElementById('tournament-modal');
  const closeBtn = document.getElementById('close-modal');

  // Close on button click
  closeBtn?.addEventListener('click', () => {
    modal?.classList.add('hidden');
  });

  // Close on outside click
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
}
