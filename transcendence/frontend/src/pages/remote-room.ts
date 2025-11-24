// frontend/src/pages/remote-room.ts
// Updated to use remote-specific scene for better 3D rendering

import { navigate } from "@/app/router";
import { getAuth } from "@/app/auth";
import { getState } from "@/app/store";
import { WS_BASE } from "@/app/config";
import { createRemoteScene } from "@/renderers/babylon/remote-scene";

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

function isWsOpen() {
	return !!gameState?.connected;
}

let canvas: HTMLCanvasElement;
let keysPressed: Set<string> = new Set();
let pingTimer: number | null = null;
let lastPingTs: number | null = null;

// Use remote-specific scene controller
let sceneController: { update: (state: any) => void; dispose: () => void } | null = null;
let lastRenderState: any | null = null;
let rafId: number | null = null;

let inputGateUntil: number = 0;
let ignoreStateUntil: number = 0;

let didMountRemoteRoom = false;
let isConnectingRemoteRoom = false;
let connectionCounter = 0;

export default function (root: HTMLElement, ctx: { params?: { roomId?: string }; url: URL }) {
	let roomId = ctx.params?.roomId ?? '';

	if (!roomId && ctx.url) {
		roomId = ctx.url.searchParams.get('roomId') ?? '';
	}

	console.log('🎮 Remote Room - roomId:', roomId);

	if (!roomId) {
		console.log('🎮 No roomId, redirecting to /remote');
		navigate('/remote');
		return () => { };
	}

	const user = getAuth();
	const state = getState();
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

	if (didMountRemoteRoom || isConnectingRemoteRoom) {
		console.warn('⚠️ Remote room already mounted/connecting');
	} else {
		isConnectingRemoteRoom = true;
	}

	root.innerHTML = `
    <section class="retro-wait py-6 md:py-8 space-y-6 max-w-6xl mx-auto px-4">
      <div class="crt-scan vignette bezel rounded-2xl p-5 md:p-6 border border-purple-500/30">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl sm:text-3xl font-black neon">REMOTE MATCH</h1>
          <button id="leaveRoom" 
            class="btn-retro px-4 py-2 rounded-lg text-white">
            ⏎ LEAVE
          </button>
        </div>

        <!-- Status -->
        <div id="statusBox" class="mt-4 rounded-lg p-4 border border-purple-400/40 bg-purple-900/20">
          <p id="statusText" class="font-black neon-soft">Connecting...</p>
        </div>

        <!-- Waiting Room -->
        <div id="waitingRoom" class="mt-6 rounded-xl p-6 space-y-5 bezel border border-purple-500/30 bg-black/30">
          <!-- Share Room Code -->
          <div class="p-4 rounded-lg border border-indigo-400/40 bg-indigo-900/10">
            <p class="text-xs text-indigo-200/80 mb-2">ROOM CODE</p>
            <div class="flex flex-wrap items-center gap-3">
              <code class="text-2xl code-chip font-black text-indigo-200 tracking-widest">${roomId}</code>
              <button id="copyCode" class="btn-retro px-3 py-2 rounded-lg text-white text-sm">
                📋 COPY
              </button>
            </div>
            <p class="text-[11px] text-indigo-300/70 mt-2">Share this code with your friend</p>
          </div>
          
          <!-- Game Format Info -->
          <div class="p-4 rounded-lg border border-yellow-400/40 bg-yellow-900/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-2xl">🏆</span>
              <p class="text-xs text-yellow-200/80 font-bold">MATCH FORMAT</p>
            </div>
            <div class="space-y-1">
              <p class="text-sm text-yellow-100 font-bold">Best of 3 Rounds</p>
              <p class="text-xs text-yellow-200/80">• First to 5 points wins each round</p>
              <p class="text-xs text-yellow-200/80">• Win 2 rounds to win the match</p>
            </div>
          </div>

          <h2 class="text-xl font-black neon mt-2">PLAYERS <span class="blink"></span></h2>

          <!-- Players List -->
          <div id="playersList" class="space-y-2"></div>

          <!-- Ready Button -->
          <button id="readyBtn" disabled
            class="btn-retro w-full px-4 py-4 rounded-lg text-indigo-50 font-black text-lg disabled:opacity-60">
            ⏳ Waiting for opponent...
          </button>
        </div>

        <!-- Game Canvas -->
        <div id="gameContainer" class="hidden mt-6 relative">
          <!-- Ping Display -->
          <div id="pingDisplay" class="absolute top-4 right-4 z-10 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono border border-purple-500/30">
            Ping: -- ms
          </div>
          
          <!-- Player Scores -->
          <div class="absolute top-4 left-4 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-blue-500/50">
            <div class="text-2xl font-mono font-bold">
              <span class="text-blue-400">P1</span> <span id="scoreP1">0</span>
            </div>
          </div>
          
          <div class="absolute top-4 right-24 z-10 bg-black/70 text-white px-4 py-2 rounded-lg border border-red-500/50">
            <div class="text-2xl font-mono font-bold">
              <span id="scoreP2">0</span> <span class="text-red-400">P2</span>
            </div>
          </div>
          
          <!-- Countdown Display -->
          <div id="countdownDisplay" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 text-6xl font-bold text-yellow-400"></div>
          
          <!-- HUD Text (Round info) -->
          <div id="hudText" class="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-mono border border-purple-500/30"></div>
          
          <!-- Game Canvas -->
          <div class="mx-auto" style="width: 1000px; max-width: 100%;">
            <canvas id="gameCanvas" tabindex="0" width="1000" height="600" class="bg-black block w-full h-auto"></canvas>
          </div>
        </div>
      </div>
    </section>
  `;

	if (!didMountRemoteRoom) {
		setTimeout(() => {
			connectToRoom(root, roomId, playerId, username);
		}, 0);
		didMountRemoteRoom = true;
	}
	setupRoomEventListeners(root);

	const onInviteDeclined = (e: Event) => {
		if (!gameState) return;
		const detail: any = (e as CustomEvent).detail || {};
		console.log('🔔 Invite declined:', detail);
		updateStatus(root, `❌ ${detail?.from || 'Player'} declined your invitation`, 'error');
		setTimeout(() => navigate('/remote'), 1500);
	};
	window.addEventListener('invite:declined', onInviteDeclined as EventListener);

	const onPlayerLeft = (e: Event) => {
		if (!gameState) return;
		const detail: any = (e as CustomEvent).detail || {};
		console.log('🔔 Player left:', detail);
		updateStatus(root, `👋 ${detail?.from || 'Player'} left the room`, 'error');
		setTimeout(() => navigate('/remote'), 1500);
	};
	window.addEventListener('player:left', onPlayerLeft as EventListener);

	return () => {
		try {
			if (gameState?.ws) {
				const s = gameState.ws;
				(gameState as any).ws = null;
				if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
					s.close();
				}
			}
		} catch { }
		try { sceneController?.dispose(); } catch { }
		sceneController = null;
		if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
		lastRenderState = null;
		window.removeEventListener('keydown', handleKeyDown);
		window.removeEventListener('keyup', handleKeyUp);
		if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
		window.removeEventListener('invite:declined', onInviteDeclined as EventListener);
		window.removeEventListener('player:left', onPlayerLeft as EventListener);
		gameState = null;
		didMountRemoteRoom = false;
		isConnectingRemoteRoom = false;
	};
}

function setupRoomEventListeners(root: HTMLElement) {
	root.querySelector('#leaveRoom')?.addEventListener('click', () => {
		if (confirm('Leave this game?')) {
			if (gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
				try { gameState.ws.send(JSON.stringify({ type: 'leave' })); } catch { }
			}
			try { gameState?.ws?.close(); } catch { }
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

		if (!gameState?.connected || !gameState.serverIdReady) {
			updateStatus(root, 'Syncing with server, please try again…', 'info');
			setTimeout(() => refreshReadyButtonState(root), 100);
			return;
		}

		try {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'ready' }));
			}
			btn.disabled = true;
			btn.textContent = '⏳ Waiting for opponent...';
			btn.classList.add('bg-gray-400');
		} catch (e) {
			console.error('❌ Failed to send ready:', e);
		}
	});

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);

	// Focus management
	window.addEventListener('click', () => {
		try {
			const c = document.getElementById('gameCanvas') as any;
			const ae = document.activeElement as HTMLElement | null;
			if (ae && ae !== c) ae.blur();
			c?.focus?.();
		} catch { }
	}, true);

	document.addEventListener('keydown', (e: KeyboardEvent) => {
		const k = e.key;
		if (k === 'a' || k === 'A' || k === 'd' || k === 'D') {
			e.preventDefault();
			e.stopPropagation();
			handleKeyDown(e);
		}
	}, true);

	document.addEventListener('keyup', (e: KeyboardEvent) => {
		const k = e.key;
		if (k === 'a' || k === 'A' || k === 'd' || k === 'D') {
			e.preventDefault();
			e.stopPropagation();
			handleKeyUp(e);
		}
	}, true);

	window.addEventListener('visibilitychange', () => {
		try {
			const ae = document.activeElement as HTMLElement | null;
			if (ae && ae !== canvas) ae.blur();
			(canvas as any).focus?.();
		} catch { }

		if (document.visibilityState === 'hidden') {
			if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
		} else if (document.visibilityState === 'visible') {
			if (!pingTimer && gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
				const ws = gameState.ws;
				pingTimer = window.setInterval(() => {
					try {
						if (ws.readyState === WebSocket.OPEN) {
							lastPingTs = Date.now();
							ws.send(JSON.stringify({ type: 'ping', ts: lastPingTs }));
						}
					} catch { }
				}, 3000);
			}
		}
	});
}

function connectToRoom(root: HTMLElement, roomId: string, playerId: string, username: string) {
	try {
		if (gameState?.ws) {
			try { gameState.ws.onopen = gameState.ws.onmessage = gameState.ws.onclose = gameState.ws.onerror = null as any; } catch { }
			try { gameState.ws.close(); } catch { }
		}
	} catch { }

	const wsUrl = `${WS_BASE}/remote?roomId=${roomId}&playerId=${playerId}&username=${encodeURIComponent(username)}`;
	if (gameState) gameState.wsConnectedRoomId = roomId;

	console.log('🔌 Connecting to:', wsUrl);
	updateStatus(root, '🔄 Connecting...', 'info');

	const ws = new WebSocket(wsUrl);
	const thisConnId = ++connectionCounter;
	if (gameState) { gameState.ws = ws; (gameState as any).connectionId = thisConnId; gameState.connected = false; }
	isConnectingRemoteRoom = false;

	ws.onopen = () => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return;
		console.log('✅ WebSocket OPEN');
		gameState.connected = true;
		updateStatus(root, '✅ Connected to room!', 'success');
		refreshReadyButtonState(root);
	};

	ws.onmessage = async (event) => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return;
		try {
			let data = event.data;
			if (data instanceof Blob) data = await data.text();
			const message = JSON.parse(data);
			if (gameState.ws !== ws) gameState.ws = ws;
			handleServerMessage(root, message);
		} catch (err) {
			console.error('❌ Error parsing message:', err);
		}
	};

	ws.onerror = (error) => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return;
		console.error('❌ WebSocket ERROR:', error);
		updateStatus(root, '❌ Connection error', 'error');
	};

	ws.onclose = (event) => {
		if (!gameState || (gameState as any).connectionId !== thisConnId) return;
		console.log('❌ WebSocket CLOSED');
		gameState.connected = false;
		updateStatus(root, '⚠️ Disconnected', 'error');
	};
}

function handleServerMessage(root: HTMLElement, message: any) {
	if (!gameState) return;

	if (!['gameState', 'hud', 'pong'].includes(message.type)) {
		console.log('📨', message.type);
	}

	switch (message.type) {
		case 'pong':
			try {
				const now = Date.now();
				const rtt = (lastPingTs && message.ts) ? (now - message.ts) : null;
				if (rtt !== null) {
					const el = root.querySelector('#pingDisplay');
					if (el) el.textContent = `Ping: ${rtt} ms`;
				}
			} catch { }
			break;

		case 'init':
			console.log('📨 INIT:', message);
			if (message.playerId && gameState.playerId !== message.playerId) {
				gameState.playerId = message.playerId;
			}
			gameState.serverIdReady = !!message.playerId;
			gameState.playerNumber = message.playerNumber;
			updateStatus(root, `You are Player ${message.playerNumber}`, 'success');

			if (message.roomInfo) {
				if (message.roomInfo.roomId) {
					gameState.wsConnectedRoomId = message.roomInfo.roomId;
				}
				const serverPlayers = Array.isArray(message.roomInfo.players) ? message.roomInfo.players : [];
				const dedupMap = new Map<string, any>();
				for (const p of serverPlayers) {
					const key = `${p.playerNumber}:${p.playerId}`;
					if (!dedupMap.has(key)) dedupMap.set(key, p);
				}
				let players = Array.from(dedupMap.values());
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
				if (idx >= 0) gameState.players[idx] = newPlayer;
				else gameState.players.push(newPlayer);
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
			// Only show countdown, don't initialize game yet
			showCountdown(root, message.count);
			if (message.message) {
				updateStatus(root, message.message, 'info');
			}
			break;

		case 'roundStart':
			if (message.message) {
				updateStatus(root, message.message, 'success');
			}
			break;

		case 'gameStart':
			// Initialize game UI and scene FIRST
			startGameUI(root, message.gameState);
			inputGateUntil = Date.now() + 500;
			ignoreStateUntil = Date.now() + 300;
			break;

		case 'gameState':
			updateGameState(root, message.state);
			break;

		case 'hud':
			updateHud(root, message);
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
	const players = [...gameState.players].sort((a, b) => a.playerNumber - b.playerNumber);
	container.innerHTML = players.map(p => `
    <div class="player-card">
      <div class="player-badge ${p.playerNumber === 1 ? 'bg-blue-600' : 'bg-red-600'}">P${p.playerNumber}</div>
      <div class="flex-1">
        <div class="font-black text-indigo-100">${p.username}</div>
        ${p.playerId === gameState?.playerId ? '<div class="chip text-[11px] text-indigo-200/90">YOU</div>' : ''}
      </div>
      ${p.ready
			? '<div class="status-ready text-sm"><span class="status-dot" style="background:#4ade80; box-shadow:0 0 10px rgba(74,222,128,.8);"></span>READY</div>'
			: '<div class="status-wait text-sm"><span class="status-dot" style="background:#94a3b8;"></span>WAITING</div>'}
    </div>
  `).join('');
}

function showCountdown(root: HTMLElement, count: number) {
	const display = root.querySelector('#countdownDisplay') as HTMLElement | null;
	if (!display) return;
	display.textContent = count > 0 ? count.toString() : 'GO!';
	if (count === 0) setTimeout(() => {
		const d = root.querySelector('#countdownDisplay') as HTMLElement | null;
		if (d) d.textContent = '';
	}, 1000);
}

function refreshReadyButtonState(root: HTMLElement) {
	if (!gameState) return;
	const btn = root.querySelector<HTMLButtonElement>('#readyBtn');
	if (!btn) return;

	const wsOpen = isWsOpen();

	if (wsOpen && !gameState.serverIdReady && (!gameState.players || gameState.players.length === 0)) {
		updateStatus(root, '🔄 Syncing with server…', 'info');
		setTimeout(() => refreshReadyButtonState(root), 150);
		btn.disabled = true;
		btn.textContent = '⏳ Waiting for opponent...';
		return;
	}

	const p1 = gameState.players.find(p => p.playerNumber === 1);
	const p2 = gameState.players.find(p => p.playerNumber === 2);
	const twoRolesAssigned = !!p1 && !!p2;
	const me = gameState.players.find(p => p.playerId === gameState.playerId) || null;
	const meNotReady = me ? !me.ready : true;
	const enable = twoRolesAssigned && wsOpen && meNotReady && !gameState.gameStarted && !!gameState.serverIdReady;

	btn.disabled = !enable;
	btn.textContent = enable ? '✅ Ready!' : '⏳ Waiting for opponent...';
	btn.classList.toggle('bg-yellow-500', enable);
	btn.classList.toggle('bg-gray-300', !enable);
}

function startGameUI(root: HTMLElement, initialState: any) {
	if (!gameState) return;

	gameState.gameStarted = true;
	root.querySelector('#waitingRoom')?.classList.add('hidden');
	root.querySelector('#gameContainer')?.classList.remove('hidden');
	canvas = root.querySelector('#gameCanvas') as unknown as HTMLCanvasElement;

	try {
		canvas.width = canvas.clientWidth || 1000;
		canvas.height = canvas.clientHeight || 600;
		try { (canvas as any).focus?.(); } catch { }
	} catch { }

	// Initialize remote-specific Babylon scene
	try {
		console.log('🎥 Initializing Remote Babylon Scene');
		sceneController = createRemoteScene(canvas, gameState.playerNumber || 1) as any;

		// Wait for scene to be ready before starting game
		if ((sceneController as any).ready) {
			(sceneController as any).ready.then(() => {
				console.log('✅ 3D Scene loaded and ready');
				// Notify server that client is ready to start
				if (gameState?.ws && gameState.ws.readyState === WebSocket.OPEN) {
					gameState.ws.send(JSON.stringify({ type: 'sceneReady' }));
				}
			});
		}

		// Start RAF loop
		const tick = () => {
			if (!sceneController) return;
			if (lastRenderState) {
				try { sceneController.update(lastRenderState); } catch { }
			}
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
	} catch (e) {
		console.error('Failed to create Remote Babylon scene:', e);
	}

	// Start ping interval
	try {
		if (gameState?.ws && gameState.ws.readyState === WebSocket.OPEN && document.visibilityState === 'visible') {
			const ws = gameState.ws;
			pingTimer = window.setInterval(() => {
				try {
					if (ws.readyState === WebSocket.OPEN) {
						lastPingTs = Date.now();
						ws.send(JSON.stringify({ type: 'ping', ts: lastPingTs }));
					} else {
						if (pingTimer) {
							clearInterval(pingTimer);
							pingTimer = null;
						}
					}
				} catch (e) {
					if (pingTimer) {
						clearInterval(pingTimer);
						pingTimer = null;
					}
				}
			}, 3000);
		}
	} catch { }

	gameState.score = initialState.score || { player1: 0, player2: 0 };
	updateScoreDisplay(root);
	updateStatus(root, '🎮 Game started! Best of 3 rounds, 5 points each!', 'success');
}

function updateGameState(root: HTMLElement, state: any) {
	if (!gameState) return;
	gameState.score = state.score;
	updateScoreDisplay(root);

	if (sceneController && typeof sceneController.update === 'function') {
		try {
			const effectiveBall = (Date.now() < ignoreStateUntil) ? { x: 0, y: 0 } : { x: state.ball?.x ?? 0, y: state.ball?.y ?? 0 };
			const effectiveP1 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player1 ?? 0);
			const effectiveP2 = (Date.now() < ignoreStateUntil) ? 0 : (state.paddles?.player2 ?? 0);

			const renderState = {
				ball: effectiveBall,
				paddles: {
					player1: effectiveP1,
					player2: effectiveP2,
				},
				score: {
					player1: state.score?.player1 ?? 0,
					player2: state.score?.player2 ?? 0,
				},
				match: {
					roundsWon: state.tournament?.roundsWon || { player1: 0, player2: 0 },
					winner: null,
					currentRound: state.tournament?.currentRound || 1,
				},
				gameStatus: 'playing',
			};
			lastRenderState = renderState;
			try { sceneController.update(renderState as any); } catch { }
		} catch (e) {
			console.warn('Babylon update error:', e);
		}
	}
}

function handleKeyDown(e: KeyboardEvent) {
	if (!gameState?.ws || gameState.ws.readyState !== WebSocket.OPEN) return;
	if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) return;

	const isUp = e.key === 'a' || e.key === 'A';
	const isDown = e.key === 'd' || e.key === 'D';
	const now = Date.now();

	// For Player 2, the camera is rotated 180°, so we need to invert the controls
	const shouldInvert = gameState.playerNumber === 2;
	
	// Allow key repeat for continuous movement
	if (isUp) {
		if (!keysPressed.has('up')) {
			keysPressed.add('up');
		}
		if (now >= inputGateUntil) {
			// Invert direction for Player 2
			const direction = shouldInvert ? 'down' : 'up';
			gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction }));
		}
		e.preventDefault();
		e.stopPropagation();
	} else if (isDown) {
		if (!keysPressed.has('down')) {
			keysPressed.add('down');
		}
		if (now >= inputGateUntil) {
			// Invert direction for Player 2
			const direction = shouldInvert ? 'up' : 'down';
			gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction }));
		}
		e.preventDefault();
		e.stopPropagation();
	}
}

function handleKeyUp(e: KeyboardEvent) {
	if (!gameState?.ws || gameState.ws.readyState !== WebSocket.OPEN) return;
	if (gameState.playerNumber !== 1 && gameState.playerNumber !== 2) return;

	const isHandled = e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D';
	if (isHandled) {
		const wasUp = keysPressed.has('up');
		const wasDown = keysPressed.has('down');
		if (wasUp) keysPressed.delete('up');
		if (wasDown) keysPressed.delete('down');
		if (!keysPressed.has('up') && !keysPressed.has('down')) {
			try {
				if (gameState.ws.readyState === WebSocket.OPEN) {
					gameState.ws.send(JSON.stringify({ type: 'paddleMove', direction: 'stop' }));
				}
			} catch { }
		}
		e.preventDefault();
		e.stopPropagation();
	}
}

function updateScoreDisplay(root: HTMLElement) {
	if (!gameState) return;
	root.querySelector('#scoreP1')!.textContent = gameState.score.player1.toString();
	root.querySelector('#scoreP2')!.textContent = gameState.score.player2.toString();
}

function updateHud(root: HTMLElement, hud: { currentRound: number; roundsWon: { player1: number; player2: number }; score: { player1: number; player2: number }; scoreLimit: number; status: string; }) {
	try {
		const hudEl = root.querySelector('#hudText') as HTMLElement | null;
		if (hudEl) {
			hudEl.textContent = `Round ${hud.currentRound}/3 | Rounds: P1-${hud.roundsWon.player1} P2-${hud.roundsWon.player2} | Score to ${hud.scoreLimit}`;
		}
	} catch { }
}

function endGame(root: HTMLElement, data: any) {
	if (!gameState) return;

	gameState.gameStarted = false;
	const winner = data.winner;
	const isYouWinner = winner === gameState.playerNumber;
	const finalScores = data.finalScores || gameState.score;
	const roundsWon = data.roundsWon || { player1: 0, player2: 0 };

	// Calculate total points across all rounds (each round is first to 5)
	const totalPointsP1 = (roundsWon.player1 * 5) + (roundsWon.player2 > 0 ? finalScores.player1 : 0);
	const totalPointsP2 = (roundsWon.player2 * 5) + (roundsWon.player1 > 0 ? finalScores.player2 : 0);

	// Show prominent winner message
	const display = root.querySelector('#countdownDisplay') as HTMLElement | null;
	if (display) {
		const winnerText = isYouWinner ? 'YOU WON!' : `Player ${winner} Won!`;
		const iconColor = isYouWinner ? '#a78bfa' : '#facc15';
		
		display.innerHTML = `
			<div style="text-align: center;">
				<img src="/icons/peace_sign.png" alt="Victory" style="width: 120px; height: 120px; filter: drop-shadow(0 0 20px ${iconColor}); margin-bottom: 1rem;" />
				<div style="font-size: 4rem; font-weight: bold; color: ${isYouWinner ? '#4ade80' : '#facc15'}; margin-bottom: 1rem;">
					${winnerText}
				</div>
				<div style="font-size: 2rem; color: white; margin-bottom: 0.5rem;">
					Total Score: ${totalPointsP1} - ${totalPointsP2}
				</div>
				<div style="font-size: 1.5rem; color: #a78bfa;">
					Rounds Won: ${roundsWon.player1} - ${roundsWon.player2}
				</div>
				<div style="font-size: 1rem; color: #94a3b8; margin-top: 1rem;">
					Returning to lobby...
				</div>
			</div>
		`;
		display.style.display = 'block';
	}

	// Update status bar
	updateStatus(root,
		isYouWinner 
			? `🎉 YOU WON THE MATCH! Total Score: ${totalPointsP1}-${totalPointsP2} | Rounds: ${roundsWon.player1}-${roundsWon.player2}` 
			: `Player ${winner} won! Total Score: ${totalPointsP1}-${totalPointsP2} | Rounds: ${roundsWon.player1}-${roundsWon.player2}`,
		isYouWinner ? 'success' : 'info'
	);

	// Log match result (server already saved to DB)
	console.log('🏁 Match ended:', {
		winner,
		isYouWinner,
		finalScores,
		roundsWon,
		totalPoints: { player1: totalPointsP1, player2: totalPointsP2 },
		matchDuration: data.matchDuration
	});

	// Return to lobby after 4 seconds
	setTimeout(() => {
		console.log('🔙 Navigating back to /remote');
		navigate('/remote');
	}, 4000);
}

function updateStatus(root: HTMLElement, message: string, type: 'info' | 'success' | 'error') {
	const box = root.querySelector('#statusBox') as HTMLElement | null;
	const text = root.querySelector('#statusText') as HTMLElement | null;
	if (!box || !text) return;

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