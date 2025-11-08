/**
 * Tournament Match Page
 * 
 * Handles the active gameplay for a tournament match with interruption detection.
 * 
 * KEY FEATURES:
 * - WebSocket-based real-time gameplay
 * - Match state persistence in sessionStorage
 * - Automatic interruption on navigation/page exit
 * - Async cleanup to ensure interruption requests complete
 * 
 * INTERRUPTION FLOW:
 * 1. User navigates away or closes page during active match
 * 2. handlePageUnload() detects active match (matchStarted && !matchCompleted)
 * 3. forfeitMatch() sends interrupt request with keepalive flag
 * 4. Backend marks match and tournament as 'interrupted'
 * 5. Cleanup completes before navigation proceeds
 * 
 * MATCH STATE TRACKING:
 * - SessionStorage key: `match_${tournamentId}_${matchId}`
 * - Possible states: 'waiting', 'in-progress', 'completed', 'interrupted'
 * - State prevents duplicate match starts and shows appropriate UI
 */

import { navigate } from "@/app/router";
import { API_BASE, WS_BASE } from "@/app/config";

export default function (root: HTMLElement, ctx: any) {
  // Get match info from sessionStorage
  const matchId = sessionStorage.getItem("currentMatchId") || "0";
  const tournamentId = sessionStorage.getItem("currentTournamentId");
  const matchPlayersStr = sessionStorage.getItem("currentMatchPlayers");
  
  let playerNames: string[] = [];
  if (matchPlayersStr) {
    try {
      playerNames = JSON.parse(matchPlayersStr);
    } catch (e) {
      playerNames = ["Player 1", "Player 2"];
    }
  } else {
    playerNames = ctx?.players || JSON.parse(sessionStorage.getItem("tournamentPlayers") || '["Player 1","Player 2"]');
  }
  
  let player1Name = playerNames[0] || "Player 1";
  let player2Name = playerNames[1] || "Player 2";

  let gameId: string | null = null;
  let ws: WebSocket | null = null;
  let canvas: HTMLCanvasElement;
  let ctx2d: CanvasRenderingContext2D;
  let player1Keys = { up: false, down: false };
  let player2Keys = { up: false, down: false };

  let gameState: any = {
    ball: { x: 0, y: 0 },
    paddles: { player1: 0, player2: 0 },
    score: { player1: 0, player2: 0 },
    tournament: { roundsWon: { player1: 0, player2: 0 }, winner: null, currentRound: 1 },
    gameStatus: 'waiting'
  };

  // Game configuration received from backend
  // Default values for rendering before game starts (only paddle/court dimensions matter)
  let gameConfig: any = {
    paddle: { width: 2, height: 40 },
    ball: { radius: 2},
    court: { width: 100, height: 200 }
  };

  let gameLoop: number | null = null;
  let lastTime = 0;
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  
  // Throttle paddle movement updates to reduce network spam
  let lastPaddleUpdateTime = 0;
  const PADDLE_UPDATE_INTERVAL = 50; // Send paddle updates every 50ms (20 times per second)
  
  // Track if match has started and is active
  // These flags determine when to trigger interruption
  let matchStarted = false;      // True when match is actively being played
  let matchCompleted = false;    // True when match finished normally with a winner
  let matchInterrupted = false;  // True when match was interrupted (player left)
  
  // Check if match is already completed/in-progress/interrupted
  // This prevents duplicate starts and shows appropriate messages
  const matchKey = `match_${tournamentId}_${matchId}`;
  const matchState = sessionStorage.getItem(matchKey);
  console.log('Match state check:', { tournamentId, matchId, matchKey, matchState });
  
  if (matchState) {
    try {
      const state = JSON.parse(matchState);
      console.log('Parsed match state:', state);
      
      if (state.status === 'completed') {
        matchCompleted = true;
        console.log('Match marked as completed');
      } else if (state.status === 'in-progress') {
        matchStarted = true;
        console.log('Match marked as in-progress');
      } else if (state.status === 'interrupted') {
        matchInterrupted = true;
        console.log('Match marked as interrupted');
      }
    } catch (e) {
      console.error('Error parsing match state:', e);
      // Clear invalid state
      sessionStorage.removeItem(matchKey);
    }
  } else {
    console.log('No previous match state found - starting fresh match');
  }

  root.innerHTML = `
    <section class="py-10 px-4 min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-blue-900 to-gray-900">
      <header class="mb-8 text-center">
        <h1 class="text-5xl font-extrabold text-white drop-shadow-lg">🏓 Tournament Match</h1>
        <p class="mt-2 text-lg text-indigo-200">Players: <span class="font-bold">${player1Name} vs ${player2Name}</span></p>
      </header>
      ${matchCompleted ? `
        <div class="mb-8 p-6 bg-green-500/20 border-2 border-green-500 rounded-xl">
          <p class="text-2xl font-bold text-white text-center">✅ This match has already been completed</p>
          <p class="text-indigo-200 text-center mt-2">Please return to the tournament lobby</p>
        </div>
      ` : matchInterrupted ? `
        <div class="mb-8 p-6 bg-red-500/20 border-2 border-red-500 rounded-xl">
          <p class="text-2xl font-bold text-white text-center">❌ Tournament Interrupted</p>
          <p class="text-indigo-200 text-center mt-2">A player left during the match - tournament cannot continue</p>
        </div>
      ` : `
      <div class="flex gap-6 mb-8">
        <button id="startBtn" class="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200" ${matchStarted ? 'disabled' : ''}>
          <span class="mr-2">🚀</span>${matchStarted ? 'Match In Progress' : 'Start Match'}
        </button>
      </div>
      `}
      <div id="gameStatus" class="mb-4 text-xl font-semibold text-indigo-100 text-center drop-shadow">
        ${matchCompleted ? '✅ Match completed' : matchInterrupted ? '❌ Tournament interrupted - no winner' : matchStarted ? '⚠️ Match in progress - leaving will interrupt tournament' : '🌐 Click "Start Match" to connect to backend'}
      </div>
      <div class="flex justify-center mb-6">
        <div class="rounded-2xl shadow-2xl bg-gradient-to-br from-gray-800 via-indigo-900 to-blue-900 p-6">
          <canvas id="gameCanvas" width="800" height="400" class="rounded-xl border-4 border-indigo-500 shadow-lg bg-black"></canvas>
        </div>
      </div>
      <div class="text-center text-indigo-200 text-base space-y-2 mb-2">
        <p id="connectionStatus">🔄 Ready to connect to backend game service</p>
        <p>🏆 First to 3 points wins a round. Win 2 rounds from 3 rounds to become the champion!</p>
        <p class="text-xs text-gray-400">Controls: ${player1Name} (W/S), ${player2Name} (↑/↓)</p>
      </div>
      <footer class="mt-8 text-gray-500 text-xs text-center">
        <span>Made with <span class="text-pink-400">♥</span> for Pong fans</span>
      </footer>
      <dialog id="winnerDialog" class="rounded-xl p-8 bg-white shadow-2xl text-center"></dialog>
    </section>
  `;

  const startBtn = root.querySelector('#startBtn') as HTMLButtonElement;
  const gameStatus = root.querySelector('#gameStatus') as HTMLDivElement;
  const connectionStatus = root.querySelector('#connectionStatus') as HTMLParagraphElement;
  const winnerDialog = root.querySelector('#winnerDialog') as HTMLDialogElement;
  canvas = root.querySelector('#gameCanvas') as HTMLCanvasElement;
  ctx2d = canvas.getContext('2d')!;

  const START_BTN_ACTIVE_CLASS = "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-600 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200";
  const START_BTN_DISABLED_CLASS = "bg-gray-600 text-gray-300 px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 cursor-not-allowed";

  function setStartButtonState() {
    if (!startBtn) return;
    if (matchStarted) {
      startBtn.disabled = true;
      startBtn.className = START_BTN_DISABLED_CLASS;
      startBtn.innerHTML = `<span class="mr-2">🚀</span>Match In Progress`;
    } else {
      startBtn.disabled = false;
      startBtn.className = START_BTN_ACTIVE_CLASS;
      startBtn.innerHTML = `<span class="mr-2">🚀</span>Start Match`;
    }
  }

  setStartButtonState();

  function updateStatus(message: string) {
    gameStatus.textContent = message;
  }

  function updateConnectionStatus(message: string) {
    connectionStatus.textContent = message;
  }

  async function createTournamentGame(): Promise<string | null> {
    try {
      updateStatus('🔄 Creating tournament match...');
      updateConnectionStatus('📡 Connecting to gateway...');
      const response = await fetch(`${API_BASE}/pong/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          player1_id: `tournament_${matchId}_p1`,
          player1_name: player1Name,
          player2_id: `tournament_${matchId}_p2`,
          player2_name: player2Name
        })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.id) throw new Error('No game ID in response');
      updateStatus(`🎮 Tournament match ${result.id} created successfully`);
      updateConnectionStatus('✅ Match created on backend');
      return result.id.toString();
    } catch (error) {
      console.error('❌ Error creating tournament match:', error);
      updateStatus('❌ Error creating match - please try again');
      updateConnectionStatus('❌ Backend connection failed');
      return null;
    }
  }

  function connectWebSocket(gameId: string) {
    connectionAttempts++;
    try {
      const wsUrl = `${WS_BASE}/pong/game-ws/${gameId}`;
      ws = new WebSocket(wsUrl);
      updateStatus('🔄 Connecting to match...');
      updateConnectionStatus(`🔌 WebSocket connecting... (${connectionAttempts}/${maxConnectionAttempts})`);

      ws.onopen = () => {
        updateStatus('🌐 Connected! Starting match...');
        updateConnectionStatus('✅ Connected to backend match');
        
        startNetworkGame();
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'START_GAME' }));
          }
        }, 500);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleBackendMessage(data);
        } catch (error) {
          console.error('❌ Error parsing backend message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed', event.code, event.reason);
        
        // If game is playing and connection lost, mark as interrupted
        if (gameState.gameStatus === 'playing') {
          updateStatus('❌ Connection lost during match - tournament interrupted');
          updateConnectionStatus('❌ Connection to backend lost');
          markMatchAsInterrupted();
        }
        
        // Attempt reconnection for non-game-playing scenarios
        if (connectionAttempts < maxConnectionAttempts && event.code === 1006 && gameState.gameStatus !== 'playing') {
          setTimeout(() => {
            updateConnectionStatus(`🔄 Reconnecting... (${connectionAttempts}/${maxConnectionAttempts})`);
            connectWebSocket(gameId);
          }, 2000);
        } else if (connectionAttempts >= maxConnectionAttempts) {
          updateStatus('❌ Backend connection failed - please try again');
          updateConnectionStatus('❌ Unable to connect to backend');
          matchStarted = false;
          sessionStorage.removeItem(matchKey);
          setStartButtonState();
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('❌ Connection error');
        updateConnectionStatus('❌ WebSocket error occurred');
      };
    } catch (error) {
      updateStatus('❌ Failed to connect - please try again');
      updateConnectionStatus('❌ Network connection failed');
      matchStarted = false;
      sessionStorage.removeItem(matchKey);
      setStartButtonState();
    }
  }

  let hasSentStartGame = false;

async function reportWinner(winnerName: string) {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping winner report");
    return;
  }
  
  try {
    console.log(`Reporting winner: ${winnerName} for match ${matchId} in tournament ${tournamentId}`);
    const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: matchId, winner: winnerName })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`Winner ${winnerName} reported to tournament ${tournamentId}`, result);
    } else {
      const errorText = await response.text();
      console.error('Failed to report winner:', response.status, errorText);
    }
  } catch (error) {
    console.error('Error reporting winner:', error);
  }
}

async function markMatchAsInterrupted() {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping interruption report");
    return;
  }
  
  try {
    console.log(`Marking match ${matchId} as interrupted in tournament ${tournamentId}`);
    const response = await fetch(`${API_BASE}/tournaments/${tournamentId}/interrupt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: matchId, reason: 'connection_timeout' })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`Match ${matchId} marked as interrupted`, result);
      
      // Show interruption dialog
      if (winnerDialog) {
        winnerDialog.innerHTML = `
          <div class="text-3xl font-bold mb-4 text-red-600">❌ Match Interrupted</div>
          <div class="text-xl mb-4">Connection lost for more than 30 seconds</div>
          <div class="text-gray-600 mb-6">The tournament has been marked as interrupted.</div>
          <button id="interruptOkBtn" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold">Back to Tournament</button>
        `;
        winnerDialog.showModal();
        winnerDialog.querySelector('#interruptOkBtn')?.addEventListener('click', () => {
          winnerDialog.close();
          if (tournamentId) {
            navigate(`/tournaments/waitingroom/${tournamentId}`);
          }
        });
      }
    } else {
      console.error('Failed to mark match as interrupted:', response.status);
    }
  } catch (error) {
    console.error('Error marking match as interrupted:', error);
  }
}

/**
 * Send interruption request to backend
 * 
 * PURPOSE:
 * - Notifies backend that a player left during an active match
 * - Marks both the match and tournament as 'interrupted'
 * - Prevents any further matches in the tournament from being played
 * 
 * WHEN CALLED:
 * - User navigates away during active gameplay (via handlePageUnload)
 * - User closes browser tab/window (via beforeunload handler with sendBeacon)
 * 
 * TECHNICAL DETAILS:
 * - Uses fetch with keepalive:true to ensure completion during page unload
 * - Updates sessionStorage to persist interrupted state locally
 * - Sends POST to /tournaments/:id/interrupt endpoint
 * - Backend updates both match.status and tournament.status to 'interrupted'
 * 
 * FLOW:
 * 1. Update local sessionStorage state
 * 2. Send POST request with keepalive flag
 * 3. Backend marks tournament as interrupted
 * 4. All clients see updated status via polling/broadcast
 */
async function forfeitMatch() {
  if (!tournamentId || !matchId) {
    console.log("No tournament context - skipping forfeit");
    return;
  }
  
  console.log(`🔴 forfeitMatch() START - Tournament: ${tournamentId}, Match: ${matchId}`);
  
  try {
    console.log(`Match ${matchId} interrupted - player left during game`);
    
    // Mark match as interrupted in sessionStorage
    sessionStorage.setItem(`match_${tournamentId}_${matchId}`, JSON.stringify({
      status: 'interrupted',
      reason: 'player_left',
      interruptedAt: Date.now()
    }));
    console.log('📝 SessionStorage updated with interrupted status');
    
    // Always use fetch (not beacon) to ensure it completes
    const data = JSON.stringify({ 
      matchId: matchId, 
      reason: 'player_left'
    });
    
    const url = `${API_BASE}/tournaments/${tournamentId}/interrupt`;
    console.log(`📡 Sending POST request to: ${url}`);
    console.log(`📦 Request body:`, data);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true // Ensures request completes even during page unload
    });
    
    console.log(`📬 Response received:`, response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Tournament ${tournamentId} marked as interrupted`, result);
      matchInterrupted = true; // Update local state
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to mark tournament as interrupted:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Error marking tournament as interrupted:', error);
  }
  
  console.log(`🔴 forfeitMatch() END`);
}

function showWinnerDialog(winner: string) {
  if (!winnerDialog) return;
  let winnerDisplay = winner;
  let actualWinner = "";
  if (winner === "player1") {
    winnerDisplay = player1Name;
    actualWinner = player1Name;
  } else if (winner === "player2") {
    winnerDisplay = player2Name;
    actualWinner = player2Name;
  } else if (!winner) {
    winnerDisplay = "Nobody";
  }

  // Report winner to tournament service
  if (actualWinner) {
    reportWinner(actualWinner);
    
    // Mark match as completed
    matchCompleted = true;
    sessionStorage.setItem(`match_${tournamentId}_${matchId}`, JSON.stringify({
      status: 'completed',
      winner: actualWinner,
      completedAt: Date.now()
    }));
  }

  winnerDialog.innerHTML = `
    <div class="text-3xl font-bold mb-4">🏆 Winner!</div>
    <div class="text-2xl mb-6">${winnerDisplay}</div>
    <button id="winnerOkBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">go back to tournament</button>
  `;
  winnerDialog.showModal();
  winnerDialog.querySelector('#winnerOkBtn')?.addEventListener('click', () => {
    winnerDialog.close();
    // Navigate back to waiting room with tournament ID
    if (tournamentId) {
      navigate(`/tournaments/waitingroom/${tournamentId}`);
    } else {
      navigate('/tournaments');
    }
  });
}

  function handleBackendMessage(data: any) {
    if (data.type === 'STATE_UPDATE' && data.gameState) {
      gameState = {
        ball: data.gameState.ball || gameState.ball,
        paddles: data.gameState.paddles || gameState.paddles,
        score: data.gameState.score || gameState.score,
        tournament: data.gameState.tournament || gameState.tournament,
        gameStatus: data.gameState.tournament?.gameStatus || 'playing'
      };

      // Update game configuration from backend if provided
      if (data.config) {
        gameConfig = data.config;
        console.log('📊 Received game config from backend:', gameConfig);
      }

      player1Name = data.gameState.player1_name || player1Name;
      player2Name = data.gameState.player2_name || player2Name;

      if (gameState.gameStatus === 'playing') {
        updateStatus('🎮 Match active - Player 1: W/S, Player 2: ↑/↓');
        hasSentStartGame = false;
      } else if (
        gameState.gameStatus === 'waiting' &&
        ws &&
        ws.readyState === WebSocket.OPEN &&
        !hasSentStartGame
      ) {
        ws.send(JSON.stringify({ type: 'START_GAME' }));
        updateStatus('🔄 Starting match after restart...');
        hasSentStartGame = true;
      } else if (gameState.gameStatus === 'gameEnd') {
        const winner = data.gameState.tournament?.winner || 'Nobody';
        updateStatus(`🏆 Match ended! Winner: ${winner}`);
        showWinnerDialog(winner);
      }
    }
  }

  function sendPaddleMovement() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    // Determine player1's direction
    let player1Direction = null;
    if (player1Keys.up && !player1Keys.down) {
      player1Direction = 'up';
    } else if (player1Keys.down && !player1Keys.up) {
      player1Direction = 'down';
    }
    
    // Determine player2's direction
    let player2Direction = null;
    if (player2Keys.up && !player2Keys.down) {
      player2Direction = 'up';
    } else if (player2Keys.down && !player2Keys.up) {
      player2Direction = 'down';
    }
    
    // Send only if there's a direction to move
    if (player1Direction) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player1',
        direction: player1Direction
      }));
    }
    
    if (player2Direction) {
      ws.send(JSON.stringify({
        type: 'MOVE_PADDLE',
        player: 'player2',
        direction: player2Direction
      }));
    }
  }

  function startNetworkGame() {
    setStartButtonState();
    if (gameLoop) {
      cancelAnimationFrame(gameLoop);
      gameLoop = null;
    }
    lastTime = 0;
    const updateNetworkGame = (currentTime: number) => {
      if (lastTime === 0) lastTime = currentTime;
      lastTime = currentTime;
      
      // Throttle paddle movement updates to reduce network spam
      if (currentTime - lastPaddleUpdateTime >= PADDLE_UPDATE_INTERVAL) {
        sendPaddleMovement();
        lastPaddleUpdateTime = currentTime;
      }
      
      drawGame();
      if (gameState.gameStatus === 'playing') {
        gameLoop = requestAnimationFrame(updateNetworkGame);
      }
    };
    gameLoop = requestAnimationFrame(updateNetworkGame);
  }

  function drawGame() {
    if (!ctx2d || !canvas || !gameState) return;
    ctx2d.fillStyle = '#000000';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);

    ctx2d.setLineDash([10, 10]);
    ctx2d.beginPath();
    ctx2d.moveTo(canvas.width / 2, 0);
    ctx2d.lineTo(canvas.width / 2, canvas.height);
    ctx2d.strokeStyle = '#00ff00';
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
    ctx2d.setLineDash([]);

    const scaleX = canvas.width / 100;
    const scaleY = canvas.height / 200;
    function toCanvasX(gameX: number) { return (gameX + 50) * scaleX; }
    function toCanvasY(gameY: number) { return (100 - gameY) * scaleY; }

    // Use paddle dimensions from backend config
    const paddleWidth = gameConfig.paddle.width;   // Use width from backend config
    const paddleHeight = gameConfig.paddle.height; // Use height from backend config

    // Draw paddles with rounded corners
    ctx2d.fillStyle = '#00ff00';
    const borderRadius = 5 * scaleX; // Rounded corner radius

    // Left paddle (Player 1)
    const leftPaddleX = -50;
    const leftPaddleY = gameState.paddles.player1 + paddleHeight / 2;
    ctx2d.beginPath();
    ctx2d.roundRect(
      toCanvasX(leftPaddleX),
      toCanvasY(leftPaddleY),
      paddleWidth * scaleX,
      paddleHeight * scaleY,
      borderRadius
    );
    ctx2d.fill();

    // Right paddle (Player 2)
    const rightPaddleX = 50 - paddleWidth;
    const rightPaddleY = gameState.paddles.player2 + paddleHeight / 2;
    ctx2d.beginPath();
    ctx2d.roundRect(
      toCanvasX(rightPaddleX),
      toCanvasY(rightPaddleY),
      paddleWidth * scaleX,
      paddleHeight * scaleY,
      borderRadius
    );
    ctx2d.fill();

    // Draw ball using radius from backend config
    const ballRadius = gameConfig.ball?.radius || 4; // Use backend config or default to 4
    ctx2d.shadowColor = '#ffff00';
    ctx2d.shadowBlur = 15;
    ctx2d.beginPath();
    ctx2d.arc(
      toCanvasX(gameState.ball.x),
      toCanvasY(gameState.ball.y),
      ballRadius * scaleX,
      0,
      Math.PI * 2
    );
    ctx2d.fillStyle = '#ffff00';
    ctx2d.fill();
    ctx2d.shadowBlur = 0;

    ctx2d.font = 'bold 36px Arial';
    ctx2d.textAlign = 'center';
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillText(
      `${gameState.score.player1} - ${gameState.score.player2}`,
      canvas.width / 2,
      50
    );

    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#888888';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(`${player1Name} (W/S)`, 20, canvas.height - 20);
    ctx2d.textAlign = 'right';
    ctx2d.fillText(`${player2Name} (↑/↓)`, canvas.width - 20, canvas.height - 20);

    ctx2d.font = '20px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(player1Name, 30, 40);
    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#ffcc00';
    ctx2d.textAlign = 'left';
    ctx2d.fillText(
      `Rounds Won: ${gameState.tournament?.roundsWon?.player1 || 0}`,
      30,
      65
    );

    ctx2d.font = '20px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'right';
    ctx2d.fillText(player2Name, canvas.width - 30, 40);
    ctx2d.font = '16px Arial';
    ctx2d.fillStyle = '#ffcc00';
    ctx2d.textAlign = 'right';
    ctx2d.fillText(
      `Rounds Won: ${gameState.tournament?.roundsWon?.player2 || 0}`,
      canvas.width - 30,
      65
    );

    ctx2d.font = 'bold 24px Arial';
    ctx2d.fillStyle = '#00ffcc';
    ctx2d.textAlign = 'center';
    const currentRound = gameState.tournament?.currentRound || 1;
    ctx2d.fillText(
      `Round ${currentRound}`,
      canvas.width / 2,
      85
    );
  }

  function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
      let changed = false;
      if (e.key === 'w' || e.key === 'W') {
        if (!player1Keys.up) changed = true;
        player1Keys.up = true;
        e.preventDefault();
      } else if (e.key === 's' || e.key === 'S') {
        if (!player1Keys.down) changed = true;
        player1Keys.down = true;
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        if (!player2Keys.up) changed = true;
        player2Keys.up = true;
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (!player2Keys.down) changed = true;
        player2Keys.down = true;
        e.preventDefault();
      }
      if (changed) sendPaddleMovement();
    });

    document.addEventListener('keyup', (e) => {
      let changed = false;
      if (e.key === 'w' || e.key === 'W') {
        if (player1Keys.up) changed = true;
        player1Keys.up = false;
      } else if (e.key === 's' || e.key === 'S') {
        if (player1Keys.down) changed = true;
        player1Keys.down = false;
      } else if (e.key === 'ArrowUp') {
        if (player2Keys.up) changed = true;
        player2Keys.up = false;
      } else if (e.key === 'ArrowDown') {
        if (player2Keys.down) changed = true;
        player2Keys.down = false;
      }
      if (changed) sendPaddleMovement();
    });
  }

  async function handleStartMatch() {
    connectionAttempts = 0;
    matchStarted = true;
    
    // Mark match as in-progress
    sessionStorage.setItem(`match_${tournamentId}_${matchId}`, JSON.stringify({
      status: 'in-progress',
      startTime: Date.now()
    }));

    setStartButtonState();
    
    updateStatus('🔄 Starting tournament match...');
    try {
      const newGameId = await createTournamentGame();
      if (newGameId) {
        gameId = newGameId;
        connectWebSocket(gameId);
      } else {
        updateStatus('❌ Failed to create match - please try again');
        matchStarted = false;
        sessionStorage.removeItem(matchKey);
        setStartButtonState();
      }
    } catch (error) {
      updateStatus('❌ Network error - please try again');
      matchStarted = false;
      sessionStorage.removeItem(matchKey);
      setStartButtonState();
    }
  }

  /**
   * Handle page unload or navigation away from match
   * 
   * CRITICAL INTERRUPTION DETECTION:
   * - Called when user navigates away via router or closes page
   * - Checks if match is actively being played
   * - If so, sends interrupt request to backend
   * 
   * CONDITIONS FOR INTERRUPT:
   * - matchStarted = true (match was initiated)
   * - matchCompleted = false (no winner declared yet)
   * - matchInterrupted = false (not already interrupted)
   * - gameStatus = 'playing' (game is actively running)
   * 
   * ASYNC HANDLING:
   * - Returns a Promise to ensure cleanup completes
   * - Router waits for this to finish before navigation
   * - Uses keepalive flag in fetch to complete even if page unloads
   */
  let isProcessingInterrupt = false;  // Prevent duplicate interrupt requests
  
  async function handlePageUnload() {
    console.log('🚨 handlePageUnload() CALLED');
    console.log('Current state:', { 
      matchStarted, 
      matchCompleted, 
      matchInterrupted,
      gameStatus: gameState.gameStatus,
      isProcessingInterrupt,
      tournamentId,
      matchId
    });
    
    if (isProcessingInterrupt) {
      console.log('⚠️ Already processing interrupt, skipping...');
      return;
    }
    
    if (matchStarted && !matchCompleted && !matchInterrupted && gameState.gameStatus === 'playing') {
      // Match is active and player is leaving - mark as interrupted
      console.log('🔥 ACTIVE MATCH DETECTED - calling forfeitMatch()');
      isProcessingInterrupt = true;
      await forfeitMatch();
      isProcessingInterrupt = false;
      console.log('✅ forfeitMatch() completed');
    } else {
      console.log('ℹ️ No active match to interrupt');
    }
    
    console.log('🚨 handlePageUnload() FINISHED');
  }
  
  // Add beforeunload event to warn user when closing browser/tab
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (matchStarted && !matchCompleted && !matchInterrupted && gameState.gameStatus === 'playing') {
      // Show browser confirmation dialog
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome
      
      // Try to send interrupt using keepalive
      if (!isProcessingInterrupt) {
        // Use navigator.sendBeacon as last resort for browser close
        const data = JSON.stringify({ matchId: matchId, reason: 'player_left' });
        navigator.sendBeacon(
          `${API_BASE}/tournaments/${tournamentId}/interrupt`,
          new Blob([data], { type: 'application/json' })
        );
      }
      
      return ''; // For some older browsers
    }
  }

    // Initialize
  if (matchCompleted) {
    // Show completed message and return button
    const backBtn = document.createElement('button');
    backBtn.className = "mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold";
    backBtn.textContent = "← Back to Tournament";
    backBtn.addEventListener('click', () => {
      if (tournamentId) {
        navigate(`/tournaments/waitingroom/${tournamentId}`);
      } else {
        navigate('/tournaments');
      }
    });
    root.querySelector('section')?.appendChild(backBtn);
  } else {
    // Normal initialization (includes interrupted local games that can resume)
    drawGame();
    const renderLoop = () => {
      drawGame();
      requestAnimationFrame(renderLoop);
    };
    requestAnimationFrame(renderLoop);

    startBtn?.addEventListener('click', handleStartMatch);
    setupKeyboardControls();
  }
  
  // Add beforeunload handler for browser close/refresh warning
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  /**
   * Cleanup function - called by router before navigation
   * 
   * CRITICAL FOR INTERRUPTION:
   * - This is an ASYNC function (returns Promise<void>)
   * - Router WAITS for this to complete before proceeding
   * - Ensures interrupt request is sent and completed
   * 
   * SEQUENCE:
   * 1. Router detects navigation (back button, link click, etc.)
   * 2. Router calls this cleanup function
   * 3. await handlePageUnload() - sends interrupt if match is active
   * 4. Cleanup completes - navigation proceeds
   * 
   * This pattern ensures interruption is properly recorded even
   * during rapid navigation (e.g., quickly pressing back button)
   */
  return async () => {
    console.log('🧹 Cleanup function called - page being unmounted');
    await handlePageUnload(); // Wait for interrupt to complete
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (ws) {
      console.log('Closing WebSocket connection');
      ws.close();
    }
  };
}
