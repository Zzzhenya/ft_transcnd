// frontend/src/pages/remote-room.ts

import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { WS_BASE } from "@/app/config";

interface RemoteGameState {
	roomId: string;
	playerId: string;
	playerNumber: number | null;
	ws: WebSocket | null;
	connected: boolean;
	serverIdReady: boolean;
	wsConnectedRoomId?: string;
	gameStarted: boolean;
	score: { player1: number; player2: number };
	players: Array<{ playerId: string; playerNumber: number; username: string; ready: boolean }>;
}

let gameState: RemoteGameState | null = null;
// track open state helper
function isWsOpen() {
	// In some browsers/proxies readyState may briefly report CONNECTING during init dispatch;
	// prefer our own connected flag once onopen fired.
	return !!gameState?.connected;
}
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let keysPressed: Set<string> = new Set();

// Global mount/connect guards to prevent duplicate WS connections on re-mounts
let didMountRemoteRoom = false;
let isConnectingRemoteRoom = false;

export default function (root: HTMLElement, ctx: { params?: { roomId?: string }; url: URL }) {
	// Get roomId from router params (which includes query parameters)
	let roomId = ctx.params?.roomId ?? '';
	
	// Fallback: If not found in params, try URL query parameters directly
	if (!roomId && ctx.url) {
		roomId = ctx.url.searchParams.get('roomId') ?? '';
	}
	
	console.log('🎮 Remote Room - roomId extracted:', roomId);
	console.log('🎮 Remote Room - ctx.params:', ctx.params);
	console.log('🎮 Remote Room - ctx.url.search:', ctx.url?.search);

	if (!roomId) {
		console.log('🎮 Remote Room - No roomId found, redirecting to /remote');
		navigate('/remote');
		return () => { };
	}

	const user = getAuth();
	const state = getState();
	// Generate a playerId once per page instance; prevent accidental duplicates on remounts
	// If the server later echoes/assigns a canonical playerId, we will switch to it.
	const playerId = `${user?.id ?? 'guest'}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
	const username = user?.name || state.session.alias || 'Anonymous';

	gameState = {
		roomId,
		playerId,
		playerNumber: null,
		ws: null,
		connected: false,
		serverIdReady: false,
		wsConnectedRoomId: undefined,
		gameStarted: false,
		score: { player1: 0, player2: 0 },
		players: []
	};

	// Prevent duplicate mount/connect
	if (didMountRemoteRoom || isConnectingRemoteRoom) {
		console.warn('⚠️ Remote room already mounted/connecting, skipping duplicate setup');
	} else {
		isConnectingRemoteRoom = true;
	}

	root.innerHTML = `
    <section class="py-6 md:py-8 space-y-6 max-w-6xl mx-auto px-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl font-bold">Room: ${roomId}</h1>
        <button id="leaveRoom" 
          class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">
          Leave Room
        </button>
      </div>

      <!-- Status -->
      <div id="statusBox" class="rounded border-2 p-4 bg-blue-50 border-blue-400">
        <p id="statusText" class="font-semibold text-blue-900">Connecting...</p>
      </div>

      <!-- Waiting Room -->
      <div id="waitingRoom" class="rounded border p-6 space-y-4">
        <h2 class="text-xl font-semibold">Waiting Room</h2>
        
        <!-- Share Room Code -->
        <div class="bg-gray-50 p-4 rounded">
          <p class="text-sm text-gray-600 mb-2">Room Code:</p>
          <div class="flex items-center gap-2">
            <code class="text-2xl font-mono font-bold">${roomId}</code>
            <button id="copyCode" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
              📋 Copy
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-2">Share this code with your friend</p>
        </div>

        <!-- Players List -->
        <div class="space-y-2">
          <h3 class="font-semibold">Players</h3>
          <div id="playersList" class="space-y-2"></div>
        </div>

        <!-- Ready Button -->
        <button id="readyBtn" disabled
          class="w-full px-4 py-3 rounded bg-yellow-500 text-white font-semibold text-lg
                 hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
          Waiting for opponent...
        </button>
      </div>

      <!-- Game Canvas -->
      <div id="gameContainer" class="hidden space-y-4">
        <div class="flex justify-between items-center bg-gray-900 text-white p-4 rounded-lg">
          <div class="text-3xl font-mono font-bold">
            <span class="text-blue-400">P1</span> <span id="scoreP1">0</span>
          </div>
          <div id="countdownDisplay" class="text-4xl font-bold text-yellow-400"></div>
          <div class="text-3xl font-mono font-bold">
            <span id="scoreP2">0</span> <span class="text-red-400">P2</span>
          </div>
        </div>
        
        <canvas id="gameCanvas" width="800" height="600" 
          class="border-4 border-gray-800 bg-black mx-auto shadow-2xl max-w-full"></canvas>
        
        <div class="bg-gray-100 p-4 rounded-lg text-center">
          <p class="text-sm">
            <kbd class="px-2 py-1 bg-white border rounded">↑</kbd> 
            <kbd class="px-2 py-1 bg-white border rounded">↓</kbd> to move
            | You are <span id="yourRole" class="font-bold"></span>
          </p>
        </div>
      </div>

    </section>
  `;

	// Only connect once
	if (!didMountRemoteRoom) {
		connectToRoom(root, roomId, playerId, username);
		didMountRemoteRoom = true;
	}
	setupRoomEventListeners(root);

	return () => {
		try {
			if (gameState?.ws) {
				const s = gameState.ws;
				(gameState as any).ws = null;
				if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
					s.close();
				}
			}
		} catch {}
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		gameState = null;
		didMountRemoteRoom = false;
		isConnectingRemoteRoom = false;
	};
}

function setupRoomEventListeners(root: HTMLElement) {
	root.querySelector('#leaveRoom')?.addEventListener('click', () => {
		if (confirm('Leave this game?')) {
			if (gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
				try { gameState.ws.send(JSON.stringify({ type: 'leave' })); } catch {}
			}
			try { gameState?.ws?.close(); } catch {}
			navigate('/remote');
		}
	});

	root.querySelector('#copyCode')?.addEventListener('click', () => {
		const roomId = gameState?.roomId;
		if (roomId) {
			navigator.clipboard.writeText(roomId).then(() => {
				updateStatus(root, '✅ Room code copied!', 'success');
			});
		}
	});

	root.querySelector('#readyBtn')?.addEventListener('click', () => {
		const btn = root.querySelector<HTMLButtonElement>('#readyBtn')!;
		const ws = gameState?.ws || null;
		console.log('🖱️ Ready clicked by', gameState?.playerId, 'ws state=', ws?.readyState);
		if (!gameState?.connected) {
			console.warn('⚠️ Not connected, cannot send ready');
			return;
		}
		if (!gameState.serverIdReady) {
			console.warn('⚠️ Server playerId not synced yet; delaying ready');
			updateStatus(root, 'Syncing with server, please try again…', 'info');
			setTimeout(() => refreshReadyButtonState(root), 100);
			return;
		}
		try {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'ready' }));
				console.log('📨 Sent ready message (immediate)');
			} else {
				// Fallback: slight delay, give ws a moment if reference swapped during init
				const uname = (getAuth()?.name) || (getState().session.alias) || 'Anonymous';
				setTimeout(() => {
					const w2 = gameState?.ws;
					if (w2 && w2.readyState === WebSocket.OPEN) {
						w2.send(JSON.stringify({ type: 'ready' }));
						console.log('📨 Sent ready message (delayed)');
					} else {
						console.warn('⚠️ WS still not open after delay, attempting HTTP fallback');
						httpFallbackReady(root, uname).catch(err => console.error('❌ HTTP fallback failed:', err));
					}
				}, 50);
			}
			btn.disabled = true;
			btn.textContent = '⏳ Waiting for opponent...';
			btn.classList.add('bg-gray-400');
		} catch (e) {
			console.error('❌ Failed to send ready:', e);
		}
	});

async function httpFallbackReady(root: HTMLElement, uname: string) {
	try {
		if (!gameState) return;
		const { roomId, playerId, wsConnectedRoomId, playerNumber } = gameState as any;
		const rid = wsConnectedRoomId || roomId;
		console.log('🌐 HTTP fallback Ready', { rid, playerId, playerNumber, username: uname });
		const res = await fetch(`/api/game/rooms/${encodeURIComponent(rid)}/players/${encodeURIComponent(playerId)}/ready`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: uname, playerNumber })
		});
		if (!res.ok) {
			console.warn('⚠️ HTTP fallback ready failed with status', res.status);
			updateStatus(root, '⚠️ Ready fallback failed', 'error');
			return;
		}
		console.log('✅ HTTP fallback ready succeeded');
	} catch (err) {
		console.error('❌ HTTP fallback error', err);
		updateStatus(root, '❌ Ready fallback error', 'error');
	}
}

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);
}

function connectToRoom(root: HTMLElement, roomId: string, playerId: string, username: string) {
	// Prevent duplicate WebSocket connections if already connecting/connected
	if (gameState?.ws && (gameState.ws.readyState === WebSocket.CONNECTING || gameState.ws.readyState === WebSocket.OPEN)) {
		console.warn('⚠️ WebSocket already connecting/connected, skipping duplicate connect');
		return;
	}

	const wsUrl = `${WS_BASE}/remote?roomId=${roomId}&playerId=${playerId}&username=${encodeURIComponent(username)}`;
	if (gameState) gameState.wsConnectedRoomId = roomId;
	console.log('🔗 WS connect params', { roomIdUsed: roomId, playerIdUsed: playerId });
	// Debug identity keys to diagnose duplicate P2/self-detection issues
	console.log('🪪 Identity', { localPlayerId: playerId, username });

	console.log('🔌 Connecting:', wsUrl);
	updateStatus(root, '🔄 Connecting...', 'info');

	const ws = new WebSocket(wsUrl);
	if (gameState) gameState.ws = ws;
	isConnectingRemoteRoom = false;

	ws.onopen = () => {
	console.log('✅ Connected');
	if (gameState) gameState.connected = true;
	updateStatus(root, '✅ Connected to room!', 'success');
	// attempt enabling Ready button after connection
	refreshReadyButtonState(root);
	};

	ws.onmessage = async (event) => {
		try {
			let data = event.data;
			
			// Handle Blob data
			if (data instanceof Blob) {
				data = await data.text();
			}
			
			const message = JSON.parse(data);
			handleServerMessage(root, message);
		} catch (err) {
			console.error('❌ Error parsing WebSocket message:', err, 'Raw data:', event.data);
		}
	};

	ws.onerror = () => {
		updateStatus(root, '❌ Connection error', 'error');
	};

	ws.onclose = () => {
	if (gameState) gameState.connected = false;
	updateStatus(root, '⚠️ Disconnected', 'error');
	try {
	const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
	if (btn) {
	btn.disabled = true;
	btn.textContent = '⏳ Waiting for opponent...';
	btn.classList.add('bg-gray-300');
	btn.classList.remove('bg-yellow-500');
	}
	} catch {}
	};
}

function handleServerMessage(root: HTMLElement, message: any) {
	if (!gameState) return;

	console.log('📨', message.type);

	switch (message.type) {
		case 'init':
			// Prefer server authoritative identity if provided
			if (message.playerId && gameState.playerId !== message.playerId) {
				console.log('🪪 Updating local playerId from server', { old: gameState.playerId, new: message.playerId });
				gameState.playerId = message.playerId;
			}
			gameState.serverIdReady = !!message.playerId;
			gameState.playerNumber = message.playerNumber;
			updateStatus(root, `You are Player ${message.playerNumber}`, 'success');
			{
				// Adopt server-authoritative roomId if provided
				if (message.roomInfo && typeof message.roomInfo.roomId === 'string' && message.roomInfo.roomId) {
					gameState.wsConnectedRoomId = message.roomInfo.roomId;
					console.log('🔁 Adopted server roomId', message.roomInfo.roomId);
				}
				const serverPlayers = Array.isArray(message.roomInfo?.players) ? message.roomInfo.players : [];
				// Deduplicate by playerId and playerNumber to avoid double P2/P1 entries
				const dedupMap = new Map<string, any>();
				for (const p of serverPlayers) {
					const key = `${p.playerNumber}:${p.playerId}`;
					if (!dedupMap.has(key)) dedupMap.set(key, p);
				}
				let players = Array.from(dedupMap.values());
				// Ensure self is present exactly once
				const hasSelf = players.some((p: any) => p.playerId === gameState.playerId);
				if (!hasSelf) {
					players.push({
						playerId: gameState.playerId,
						playerNumber: message.playerNumber,
						username: 'You',
						ready: false,
					});
				}
				gameState.players = players;
			}
			updatePlayersList(root);
			// Re-evaluate ready state right after init processing
			setTimeout(() => refreshReadyButtonState(root), 0);
			break;

		case 'playerJoined':
			{
				const idx = gameState.players.findIndex(p => p.playerId === message.playerId);
				const newPlayer = {
					playerId: message.playerId,
					playerNumber: message.playerNumber,
					username: message.playerInfo.username,
					ready: false
				};
				if (idx >= 0) gameState.players[idx] = newPlayer; else gameState.players.push(newPlayer);
			}
			updatePlayersList(root);
			updateStatus(root, `${message.playerInfo.username} joined!`, 'info');
			refreshReadyButtonState(root);
			break;

		case 'playerReady':
			{
				const player = gameState.players.find(p => p.playerId === message.playerId);
				if (player) {
					player.ready = true;
					updatePlayersList(root);
				}
			}
			refreshReadyButtonState(root);
			break;

		case 'countdown':
			showCountdown(root, message.count);
			break;

		case 'gameStart':
			startGameUI(root, message.gameState);
			break;

		case 'gameState':
			updateGameState(root, message.state);
			break;

		case 'gameEnd':
			endGame(root, message);
			break;

		case 'playerDisconnected':
			updateStatus(root, '⚠️ Opponent disconnected', 'error');
			setTimeout(() => {
				if (confirm('Opponent left. Return to remote lobby?')) {
					navigate('/remote');
				}
			}, 2000);
			break;

		case 'error':
			updateStatus(root, `❌ ${message.message}`, 'error');
			break;
	}
}

function updatePlayersList(root: HTMLElement) {
	if (!gameState) return;

	const container = root.querySelector('#playersList')!;
	// Sort by playerNumber for stable display
	const players = [...gameState.players].sort((a, b) => a.playerNumber - b.playerNumber);
	container.innerHTML = players.map(p => `
    <div class="flex items-center gap-3 p-3 rounded ${p.ready ? 'bg-green-100 border-2 border-green-400' : 'bg-gray-100'}">
      <div class="w-10 h-10 rounded-full ${p.playerNumber === 1 ? 'bg-blue-500' : 'bg-red-500'} 
                  flex items-center justify-center text-white font-bold">
        P${p.playerNumber}
      </div>
      <div class="flex-1">
        <div class="font-semibold">${p.username}</div>
        ${p.playerId === gameState?.playerId ? '<div class="text-xs text-blue-600">👈 You</div>' : ''}
      </div>
      ${p.ready ? '<span class="text-green-600 font-bold">✓</span>' : '<span class="text-gray-400">○</span>'}
    </div>
  `).join('');
}

function showCountdown(root: HTMLElement, count: number) {
	const display = root.querySelector('#countdownDisplay')!;
	display.textContent = count > 0 ? count.toString() : 'GO!';
	if (count === 0) setTimeout(() => display.textContent = '', 1000);
}

function refreshReadyButtonState(root: HTMLElement) {
	if (!gameState) return;
	const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
	if (!btn) return;
	// Opponent presence: exactly one P1 and one P2 assigned by role
	const p1 = gameState.players.find(p => p.playerNumber === 1);
	const p2 = gameState.players.find(p => p.playerNumber === 2);
	const twoRolesAssigned = !!p1 && !!p2;
	const wsOpen = isWsOpen();
	// Identify self by server-authoritative playerId
	const me = gameState.players.find(p => p.playerId === gameState.playerId) || null;
	const meNotReady = me ? !me.ready : true; // if not in list yet, allow ready once connected
	const enable = twoRolesAssigned && wsOpen && meNotReady && !gameState.gameStarted && !!gameState.serverIdReady;
	btn.disabled = !enable;
	btn.textContent = enable ? '✅ Ready!' : '⏳ Waiting for opponent...';
	btn.classList.toggle('bg-yellow-500', enable);
	btn.classList.toggle('bg-gray-300', !enable);
	// Debug why disabled
	console.log('🧪 Ready gating', {
		wsOpen,
		twoRolesAssigned,
		me: me && { id: me.playerId, num: me.playerNumber, ready: me.ready },
		enable,
		players: gameState.players.map(p => ({ id: p.playerId, num: p.playerNumber, u: p.username, ready: p.ready }))
	});
}

function startGameUI(root: HTMLElement, initialState: any) {
	if (!gameState) return;

	gameState.gameStarted = true;
	root.querySelector('#waitingRoom')?.classList.add('hidden');
	root.querySelector('#gameContainer')?.classList.remove('hidden');

	canvas = root.querySelector('#gameCanvas') as unknown as HTMLCanvasElement;
	ctx = canvas.getContext('2d')!;

	root.querySelector('#yourRole')!.textContent = `Player ${gameState.playerNumber}`;
	gameState.score = initialState.score;
	updateScoreDisplay(root);
	updateStatus(root, '🎮 Game started!', 'success');
}

function updateGameState(root: HTMLElement, state: any) {
	if (!gameState) return;
	gameState.score = state.score;
	updateScoreDisplay(root);
	drawGame(state);
}

function drawGame(state: any) {
	if (!ctx || !canvas) return;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	// Center line
	ctx.strokeStyle = '#333';
	ctx.setLineDash([15, 15]);
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
	ctx.setLineDash([]);

	// Paddles
	const paddleWidth = 15, paddleHeight = 100, paddleOffset = 40;

	ctx.fillStyle = '#3b82f6';
	const p1Y = canvas.height / 2 - state.paddles.player1;
	ctx.fillRect(paddleOffset, p1Y - paddleHeight / 2, paddleWidth, paddleHeight);

	ctx.fillStyle = '#ef4444';
	const p2Y = canvas.height / 2 - state.paddles.player2;
	ctx.fillRect(canvas.width - paddleOffset - paddleWidth, p2Y - paddleHeight / 2, paddleWidth, paddleHeight);

	// Ball
	ctx.fillStyle = '#fff';
	ctx.shadowBlur = 20;
	ctx.shadowColor = '#fff';
	ctx.beginPath();
	ctx.arc(canvas.width / 2 + state.ball.x, canvas.height / 2 - state.ball.y, 12, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;
}

function handleKeyDown(e: KeyboardEvent) {
	if (!gameState?.gameStarted || !gameState?.ws || gameState.ws.readyState !== WebSocket.OPEN) return;

	if (e.key === 'ArrowUp' && !keysPressed.has('ArrowUp')) {
		keysPressed.add('ArrowUp');
		gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'up' }));
		e.preventDefault();
	} else if (e.key === 'ArrowDown' && !keysPressed.has('ArrowDown')) {
		keysPressed.add('ArrowDown');
		gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'down' }));
		e.preventDefault();
	}
}

function handleKeyUp(e: KeyboardEvent) {
	if (!gameState?.gameStarted || !gameState?.ws) return;

	if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
		keysPressed.delete(e.key);
		if (gameState.ws.readyState === WebSocket.OPEN) {
			gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'stop' }));
		}
		e.preventDefault();
	}
}

function updateScoreDisplay(root: HTMLElement) {
	if (!gameState) return;
	root.querySelector('#scoreP1')!.textContent = gameState.score.player1.toString();
	root.querySelector('#scoreP2')!.textContent = gameState.score.player2.toString();
}

function endGame(root: HTMLElement, data: any) {
	if (!gameState) return;

	gameState.gameStarted = false;
	const winner = data.winner;
	const isYouWinner = winner === gameState.playerNumber;

	updateStatus(root,
		isYouWinner ? '🎉🏆 YOU WON! 🏆🎉' : `Player ${winner} won!`,
		isYouWinner ? 'success' : 'info'
	);

	setTimeout(() => {
		if (confirm('Play again?')) {
			window.location.reload();
		} else {
			navigate('/remote');
		}
	}, 3000);
}

function updateStatus(root: HTMLElement, message: string, type: 'info' | 'success' | 'error') {
	const box = root.querySelector('#statusBox')!;
	const text = root.querySelector('#statusText')!;

	box.className = `rounded border-2 p-4 ${type === 'success' ? 'bg-green-50 border-green-400' :
			type === 'error' ? 'bg-red-50 border-red-400' :
				'bg-blue-50 border-blue-400'
		}`;

	text.className = `font-semibold ${type === 'success' ? 'text-green-900' :
			type === 'error' ? 'text-red-900' :
				'text-blue-900'
		}`;

	text.textContent = message;
}