// frontend/src/pages/dashboard.ts
// Minimal changes - just improved tournament display
import { getAuth } from "@/app/auth";
import { navigate } from "@/app/router";

interface RemoteMatch {
  id: number;
  opponentName: string;
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
  player1: { id: number | null; alias: string };
  player2: { id: number | null; alias: string };
  winner: { id: number | null; alias: string } | null;
  score: { player1: number; player2: number };
  status: string;
  player1Score?: number;  // ← ADDED
  player2Score?: number;  // ← ADDED
}

// ← NEW: Interface for tournament bracket data
interface TournamentDetails {
  id: number;
  name: string;
  size: number;
  status: string;
  winner?: string;
  bracket?: {
    rounds: Array<Array<{
      player1: string | null;
      player2: string | null;
      winner: string | null;
      player1Score?: number;
      player2Score?: number;
      matchId: string;
      status: string;
    }>>;
  };
}

// Utilities
const resultBadges = {
  won: '<span class="chip chip-green">✓ Victory</span>',
  lost: '<span class="chip chip-red">✗ Defeat</span>',
  draw: '<span class="chip chip-yellow">− Draw</span>'
};

function formatDate(dateString: string | null): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}

async function fetchWithAuth(url: string) {
  const response = await fetch(url, {
    credentials: 'include'
  });

  if (response.status === 204 || response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function setState(prefix: string, state: 'loading' | 'error' | 'empty' | 'content', errorMsg = '') {
  ['loading', 'error', 'empty', 'container'].forEach(s => {
    document.getElementById(`${prefix}-${s}`)?.classList.add('hidden');
  });

  if (state === 'error' && errorMsg) {
    const el = document.getElementById(`${prefix}-error`);
    if (el) el.textContent = errorMsg;
  }

  document.getElementById(`${prefix}-${state === 'content' ? 'container' : state}`)?.classList.remove('hidden');
}

// Render functions
function renderMatch(m: RemoteMatch) {
  return `
    <tr class="hover:bg-gray-900/20 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">#${m.id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${m.opponentName}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
        <span class="font-semibold">${m.userScore}</span> - <span class="font-semibold">${m.opponentScore}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">${resultBadges[m.result] || ''}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${formatDate(m.finishedAt)}</td>
    </tr>
  `;
}

function renderTournamentMatch(m: TournamentMatch) {
  const finished = m.status === 'finished' || m.status === 'completed';

  const p1Score = m.player1Score ?? m.score?.player1 ?? 0;
  const p2Score = m.player2Score ?? m.score?.player2 ?? 0;

  // Derive player names
  const player1Name = m.player1?.alias || 'TBD';
  const player2Name = m.player2?.alias || 'TBD';

  // Determine winner alias robustly: prefer `m.winner.alias`, fallback to scores if available
  const winnerAlias = m.winner?.alias || (p1Score > p2Score ? player1Name : p2Score > p1Score ? player2Name : null);
  const p1Win = !!winnerAlias && winnerAlias === player1Name;
  const p2Win = !!winnerAlias && winnerAlias === player2Name;


  const isPending = !m.player1?.alias || !m.player2?.alias;

  return `
    <div class="card-violet rounded-lg p-4 border ${finished ? 'border-green-700' :
      isPending ? 'border-gray-600' :
        'border-purple-700'
    }">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-medium text-gray-400">Match #${m.matchNumber}</span>
        <span class="text-xs px-2 py-1 rounded font-semibold ${finished ? 'bg-green-600 text-white' :
      isPending ? 'bg-gray-600 text-gray-300' :
        'bg-yellow-600 text-white'
    }">${finished ? '✓ Complete' :
      isPending ? 'Pending' :
        '⏳ ' + m.status
    }</span>
      </div>
      
      <div class="grid grid-cols-3 gap-4 items-center mb-2">
        <div class="text-right ${p1Win ? 'bg-green-900/30 rounded p-2' : ''}">
          <p class="font-semibold ${isPending ? 'text-gray-500 italic' :
      p1Win ? 'text-green-400' :
        'text-white'
    } flex items-center justify-end gap-1">
            ${p1Win ? '🏆 ' : ''}${player1Name}
          </p>
        </div>
        <div class="text-center">
          <p class="text-3xl font-bold ${isPending ? 'text-gray-600' : 'text-white'}">
            ${isPending ? '- : -' : `${p1Score} : ${p2Score}`}
          </p>
        </div>
        <div class="text-left ${p2Win ? 'bg-green-900/30 rounded p-2' : ''}">
          <p class="font-semibold ${isPending ? 'text-gray-500 italic' :
      p2Win ? 'text-green-400' :
        'text-white'
    } flex items-center gap-1">
            ${p2Win ? '🏆 ' : ''}${player2Name}
          </p>
        </div>
      </div>
      
      ${finished && winnerAlias ? `
        <div class="mt-2 pt-2 border-t border-gray-700 text-center">
          <p class="text-sm text-green-400 font-semibold">
            Winner: ${winnerAlias} (${p1Win ? p1Score : p2Score} - ${p1Win ? p2Score : p1Score})
          </p>
        </div>
      ` : ''}
    </div>
  `;
}
// ← NEW: Render round summary
function renderRoundSummary(round: number, matches: TournamentMatch[], totalRounds: number) {
  const completedMatches = matches.filter(m => m.status === 'finished' || m.status === 'completed').length;
  const allComplete = completedMatches === matches.length;

  let roundLabel = `Round ${round}`;
  if (round === totalRounds) roundLabel = '🏆 FINAL';
  else if (round === totalRounds - 1) roundLabel = '⭐ SEMI-FINAL';
  else if (round === 1) roundLabel = '🎯 OPENING ROUND';

  return `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3 pb-2 border-b-2 ${allComplete ? 'border-green-600' : 'border-purple-600'
    }">
        <h4 class="text-lg font-bold flex items-center gap-2 ${allComplete ? 'text-green-400' : 'text-purple-400'
    }">
          ${roundLabel}
        </h4>
        <span class="text-sm font-semibold ${allComplete ? 'text-green-400' : 'text-gray-400'
    }">
          ${completedMatches} / ${matches.length} Complete ${allComplete ? '✅' : ''}
        </span>
      </div>
      
      <div class="grid grid-cols-1 ${matches.length > 1 ? 'md:grid-cols-2' : ''} gap-3">
        ${matches.map(renderTournamentMatch).join('')}
      </div>
    </div>
  `;
}

// ← NEW: Render tournament winner banner
function renderTournamentWinner(winner: string, tournament: TournamentDetails) {
  return `
    <div class="mb-6 bg-gradient-to-r from-yellow-600/20 via-orange-600/20 to-yellow-600/20 rounded-lg p-6 border-2 border-yellow-500">
      <div class="text-center">
        <div class="text-5xl mb-3">🏆</div>
        <h3 class="text-2xl font-black text-yellow-400 mb-2">TOURNAMENT CHAMPION</h3>
        <div class="text-3xl font-bold text-white mb-2">${winner}</div>
        <p class="text-sm text-gray-300">Congratulations on winning ${tournament.size}-player tournament!</p>
      </div>
    </div>
  `;
}

// Load data
async function loadRemoteMatches(userId: number) {
  try {
    setState('matches', 'loading');
    const data = await fetchWithAuth(`/api/user-service/users/${userId}/remote-matches`);

    if (!data || !data.matches?.length) {
      setState('matches', 'empty');
      return;
    }

    setState('matches', 'content');
    const tbody = document.getElementById('matches-tbody');
    if (tbody) tbody.innerHTML = data.matches.map(renderMatch).join('');

  } catch (error) {
    console.error('Failed to load remote matches:', error);
    setState('matches', 'error', 'Failed to load match history');
  }
}

async function loadTournaments(userId: number) {
  try {
    setState('tournaments', 'loading');
    const data = await fetchWithAuth(`/api/user-service/users/${userId}/tournaments`);

    if (!data || !data.tournaments?.length) {
      setState('tournaments', 'empty');
      return;
    }

    setState('tournaments', 'content');
    const list = document.getElementById('tournaments-list');
    if (list) {
      list.innerHTML = data.tournaments.map((t: TournamentParticipation) => `
        <li class="tournament-item flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            data-tournament-id="${t.tournamentId}">
          <span class="text-2xl">🏆</span>
          <span class="text-sm font-medium text-gray-900">Tournament #${t.tournamentId}</span>
        </li>
      `).join('');

      list.querySelectorAll('.tournament-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.getAttribute('data-tournament-id');
          if (id) openTournamentModal(parseInt(id));
        });
      });
    }

  } catch (error) {
    console.error('Failed to load tournaments:', error);
    setState('tournaments', 'error', 'Failed to load tournament history');
  }
}

// ← ENHANCED: Show tournament with rounds, winners, and scores
async function openTournamentModal(tournamentId: number) {
  const modal = document.getElementById('tournament-modal');
  const title = document.getElementById('modal-title');
  const loading = document.getElementById('modal-loading');
  const error = document.getElementById('modal-error');
  const content = document.getElementById('modal-content');

  modal?.classList.remove('hidden');
  if (title) title.innerHTML = `<img src="/icons/trophy.png" class="icon-px icon-px--violet" alt="">Tournament #${tournamentId}`;
  
  loading?.classList.remove('hidden');
  error?.classList.add('hidden');
  content?.classList.add('hidden');

  try {
    // Try to get full tournament details first
    const tournamentData = await fetchWithAuth(`/api/tournaments/${tournamentId}`);

    // Then get matches
    const matchesData = await fetchWithAuth(`/api/user-service/tournaments/${tournamentId}/matches`);
    loading?.classList.add('hidden');

    if (!matchesData || !matchesData.matches?.length) {
      if (content) content.innerHTML = '<p class="text-center text-gray-500">No matches found</p>';
      content?.classList.remove('hidden');
      return;
    }

    content?.classList.remove('hidden');

    // Group matches by round
    const byRound: { [key: number]: TournamentMatch[] } = {};
    matchesData.matches.forEach((m: TournamentMatch) => {
      if (!byRound[m.round]) byRound[m.round] = [];
      byRound[m.round].push(m);
    });

    const sortedRounds = Object.entries(byRound).sort(([a], [b]) => parseInt(a) - parseInt(b));
    const totalRounds = sortedRounds.length;

    // Check if tournament is complete and has a winner
    const isComplete = tournamentData?.status === 'finished' || tournamentData?.status === 'completed';
    const winner = tournamentData?.bracket?.rounds?.[totalRounds - 1]?.[0]?.winner;

    if (content) {
      content.innerHTML = `
        ${winner && isComplete ? renderTournamentWinner(winner, tournamentData) : ''}
        
        ${sortedRounds.map(([round, matches]) =>
        renderRoundSummary(parseInt(round), matches, totalRounds)
      ).join('')}
        
        ${isComplete ? `
          <div class="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h4 class="text-lg font-bold text-purple-400 mb-3">📊 Tournament Summary</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-white">${tournamentData.size || (sortedRounds[0]?.[1]?.length * 2) || 'N/A'}</div>
                <div class="text-xs text-gray-400">Total Players</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-white">${totalRounds}</div>
                <div class="text-xs text-gray-400">Rounds</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-white">${matchesData.matches.length}</div>
                <div class="text-xs text-gray-400">Total Matches</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-400">${matchesData.matches.filter((m: TournamentMatch) => m.status === 'finished').length}</div>
                <div class="text-xs text-gray-400">Completed</div>
              </div>
            </div>
          </div>
        ` : ''}
      `;
    }

  } catch (error) {
    console.error('Failed to load tournament matches:', error);
    loading?.classList.add('hidden');
    error?.classList.remove('hidden');
  }
}

function setupModalHandlers() {
  const modal = document.getElementById('tournament-modal');
  const closeBtn = document.getElementById('close-modal');

  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal?.classList.contains('hidden')) modal.classList.add('hidden');
  });
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
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold title-yellow flex items-center gap-2">
          <img src="/icons/dashboard.png" class="icon-px icon-px--yellow" alt="Dashboard">
          Dashboard ${user.username}
        </h1>
      </div>

      <!-- Remote Match History -->
      <div class="card-violet rounded-lg border p-6 shadow-sm">
        <h2 class="text-xl font-bold mb-4 title-violet flex items-center gap-2">
          <img src="/icons/rocket.png" class="icon-px icon-px--violet" alt="Remote Matches">
          Remote Match History
        </h2>
        
        <div id="matches-loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p class="mt-4 text-gray-300">Loading matches...</p>
        </div>
        <div id="matches-empty" class="hidden text-center py-8 text-gray-400">
          <p class="text-lg">No matches played yet</p>
          <p class="text-sm mt-2">Your remote match history will appear here</p>
        </div>

        <div id="matches-container" class="hidden overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-800">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Match #</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Opponent Alias</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Score</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Result</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody id="matches-tbody" class="bg-transparent divide-y divide-gray-800 text-gray-200"></tbody>
          </table>
        </div>
      </div>

      <!-- Tournament History -->
      <div class="card-violet rounded-lg border p-6 shadow-sm">
        <h2 class="text-xl font-bold mb-4 title-violet flex items-center gap-2">
          <img src="/icons/trophy.png" class="icon-px icon-px--violet" alt="Tournament History">
          Tournament History
        </h2>
        
        <div id="tournaments-loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p class="mt-4 text-gray-300">Loading tournaments...</p>
        </div>
        <div id="tournaments-empty" class="hidden text-center py-8 text-gray-400">
          <p class="text-lg">No tournaments played yet</p>
          <p class="text-sm mt-2">Your tournament participation will appear here</p>
        </div>

        <div id="tournaments-container" class="hidden">
          <ul id="tournaments-list" class="space-y-2"></ul>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex gap-3">
        <button id="back-to-profile-btn" class="px-6 py-3 rounded-lg btn-retro font-semibold transition-colors">
          <img src="/icons/profile.png" class="icon-px icon-px--violet" alt="" aria-hidden="true">
          Back to Profile
        </button>
      </div>

      <!-- Tournament Matches Modal (ENHANCED) -->
      <div id="tournament-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div class="card-violet rounded-lg border shadow-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
          <div class="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 id="modal-title" class="text-2xl font-bold title-violet flex items-center gap-2"></h3>
            <button id="close-modal" class="text-gray-300 hover:text-gray-100 text-3xl font-bold leading-none">&times;</button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 text-gray-200">
            <div id="modal-loading" class="text-center py-8">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
              <p class="mt-4 text-gray-300">Loading tournament details...</p>
            </div>

            <div id="modal-content" class="hidden space-y-4"></div>
          </div>
        </div>
      </div>
      
    </section>
  `;

  root.querySelector<HTMLButtonElement>("#back-to-profile-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/profile");
  });

  loadRemoteMatches(user.id);
  loadTournaments(user.id);
  setupModalHandlers();
}