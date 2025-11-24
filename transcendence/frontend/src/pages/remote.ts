// frontend/src/pages/remote-new.ts

import { navigate } from "@/app/router";
import { getAuth, getToken } from "@/app/auth";
import { getState } from "@/app/store";
import { onlineManager } from '../utils/efficient-online-status';

interface Friend {
	friend_id: string;
	username: string;
	online: boolean;
	lastSeen?: string;
	status: string;
	created_at: string;
}

export default function (root: HTMLElement) {
	const user = getAuth();
	const state = getState();
	const signedIn = !!user;
	const isGuest = !user && !!state.session.alias;

	let friends: Friend[] = [];
	let onlineUsers: any[] = [];


	// Load friends list using efficient online manager
	async function loadFriends() {
		try {
			// if (user) {
			// 	const token = getToken();
			// 	const res = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/friends`, {
			// 		headers: {
			// 			'Authorization': `Bearer ${token || ''}`
			// 		},
			// 		credentials: 'include'
			// 	});
			// 	if (res.ok) {
			// 		const data = await res.json();
			// 		friends = data.friends || [];
			// 	}
			// }
			console.log('👥 Loading friends with efficient system');
			friends = await onlineManager.getFriendsStatus();
			console.log('👥 Loaded friends:', friends.length);
		} catch (error) {
			console.log('Could not load friends:', error);
			friends = []; // Fallback to empty array
		}
	}

	// Force refresh friends (for manual refresh button)
	async function refreshFriends() {
		try {
			console.log('🔄 Force refreshing friends');
			friends = await onlineManager.refreshFriendsStatus();
			await render();
		} catch (error) {
			console.log('Could not refresh friends:', error);
		}
	}

	// Add friend function
	async function addFriend(username: string) {
		try {
			if (user) {
				const token = getToken();
				const res = await fetch(`/api/user-service/users/${user.id}/friends`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token || ''}`
					},
					credentials: 'include',
					body: JSON.stringify({ friendUsername: username })
				});
				
				if (res.ok) {
					showMessage('Friend request sent successfully!', 'success');
					await loadFriends(); // Reload friends list
					await render(); // Re-render the page
				} else {
					const error = await res.json();
					showMessage(error.message || 'Failed to add friend', 'error');
				}
			}
		} catch (error) {
			console.log('Could not add friend:', error);
			showMessage('Failed to add friend', 'error');
		}
	}

	// Show message function
	function showMessage(message: string, type: 'success' | 'error' | 'info') {
		const messageEl = document.createElement('div');
		messageEl.className = `fixed top-4 right-4 px-6 py-3 rounded-lg font-semibold z-50 transition-all transform translate-x-0 ${
			type === 'success' ? 'bg-green-500 text-white' :
			type === 'error' ? 'bg-red-500 text-white' :
			'bg-blue-500 text-white'
		}`;
		messageEl.textContent = message;
		document.body.appendChild(messageEl);
		
		setTimeout(() => {
			messageEl.style.transform = 'translateX(100%)';
			setTimeout(() => messageEl.remove(), 300);
		}, 3000);
	}

	// Load online users for matchmaking
	async function loadOnlineUsers() {
		try {
			const res = await fetch(`/api/user-service/users/online`, {credentials:'include'});
			if (res.ok) {
				const data = await res.json();
				onlineUsers = data.users || [];
			}
		} catch (error) {
			console.log('Could not load online users:', error);
			onlineUsers = Array.from({length: Math.floor(Math.random() * 20) + 5}, (_, i) => ({ id: i, name: `Player${i}` }));
		}
	}

	async function render() {
		root.innerHTML = `
		<section class="retro-wait min-h-screen py-6 px-4">
			<div class="max-w-6xl mx-auto">
				<!-- Header -->
				<div class="bezel rounded-2xl p-5 md:p-6 border mb-6">
					<div class="flex justify-between items-center mb-4 px-2">
						<button id="backBtn" class="btn-retro px-4 py-2 rounded-lg text-white">← BACK</button>
						${signedIn ? `
							<button id="logoutBtn" class="btn-retro px-4 py-2 rounded-lg text-white">LOGOUT</button>
						` : isGuest ? `
							<button id="loginBtn" class="btn-retro px-4 py-2 rounded-lg text-white">SIGN IN</button>
						` : `
							<button id="loginBtn" class="btn-retro px-4 py-2 rounded-lg text-white">SIGN IN</button>
						`}
					</div>
					<div class="text-center">
						<div class="mb-2 flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/rocket.png" alt="Remote" /></div>
						<h1 class="text-4xl neon mb-3 tracking-tight font-normal">REMOTE</h1>
						<div id="userInfo" class="flex justify-center mb-4"></div>
						<p class="text-sm text-gray-300 uppercase">Challenge friends or find opponents worldwide!</p>
					</div>
				</div>

				<!-- Game Mode Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					
					<!-- Quick Match -->
					<div class="group relative rounded-2xl p-6 bezel border">
						<div class="text-center">
							<div class="mb-4 group-hover:scale-110 transition-transform flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/rock_sign.png" alt="Quick Match" /></div>
							<h2 class="text-2xl neon mb-2 font-normal">QUICK MATCH</h2>
							<p class="text-sm mb-4 uppercase" style="color:#c4b5fd">Find a random opponent instantly</p>
							<div class="text-xs text-green-300 font-bold mb-4">
								 ${onlineUsers.length} players online
							</div>
							<button id="quickMatchBtn" class="btn-retro w-full py-3 rounded-xl text-white ${(!signedIn && !isGuest) ? 'opacity-30 cursor-not-allowed' : ''}" ${(!signedIn && !isGuest) ? 'disabled' : ''}>
								<img class="icon-px icon-px--violet mr-2 align-middle inline" src="/icons/rock_sign.png" alt="Quick" /> FIND MATCH
							</button>
						</div>
					</div>

					<!-- Play with Friends -->
					<div class="group relative rounded-2xl p-6 bezel border">
						<div class="text-center">
							<div class="mb-4 group-hover:scale-110 transition-transform flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/korean_heart.png" alt="Friends" /></div>
							<h2 class="text-2xl neon mb-2 font-normal">FRIENDS</h2>
							<p class="text-sm mb-4 uppercase" style="color:#c4b5fd">Challenge your friends</p>
							<div class="text-xs text-blue-300 font-bold mb-4">
								 ${friends.filter(f => f.online).length} friends online
							</div>
							<button id="friendsBtn" class="btn-retro w-full py-3 rounded-xl text-white ${(!signedIn && !isGuest) ? 'opacity-30 cursor-not-allowed' : ''}" ${(!signedIn && !isGuest) ? 'disabled' : ''}>
								<img class="icon-px icon-px--violet mr-2 align-middle inline" src="/icons/korean_heart.png" alt="Friends" /> VIEW FRIENDS
							</button>
						</div>
					</div>

					<!-- Join Room -->
					<div class="group relative rounded-2xl p-6 bezel border">
						<div class="text-center">
							<div class="mb-4 group-hover:scale-110 transition-transform flex justify-center"><img class="icon-px-lg icon-px--violet" src="/icons/arrow.png" alt="Join Room" /></div>
							<h2 class="text-2xl neon mb-2 font-normal">JOIN ROOM</h2>
							<p class="text-sm mb-4 uppercase" style="color:#c4b5fd">Enter a room code</p>
							<div class="mb-4">
								<input id="roomCodeInput" type="text" 
									placeholder="ROOM CODE" 
									class="w-full px-3 py-2 rounded-lg bg-black/30 border border-purple-500/30 text-white placeholder-white/60 font-mono text-center uppercase font-normal focus:border-purple-400 focus:outline-none"
									maxlength="6" />
							</div>
							<button id="joinRoomBtn" class="btn-retro w-full py-3 rounded-xl text-white">
								<img class="icon-px icon-px--violet mr-2 align-middle inline" src="/icons/arrow.png" alt="Join" /> JOIN ROOM
							</button>
						</div>
					</div>
				</div>

				<!-- Friends List (expandable) -->
				<div id="friendsSection" class="hidden mb-8">
					<div class="bezel rounded-2xl p-6 border">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-2xl neon font-normal"> FRIENDS LIST</h3>
							<div class="flex items-center gap-3">
								<button id="refreshFriendsBtn" class="text-blue-400 hover:text-blue-300 transition-colors text-xl" title="Refresh friend status">
									
								</button>
								<button id="closeFriendsBtn" class="text-white/60 hover:text-white transition-colors text-2xl">✕</button>
							</div>
						</div>
						
						<div id="friendsList" class="space-y-3">
							${friends.length > 0 ? friends.map(friend => `
								<div class="flex items-center justify-between p-4 bg-black/30 rounded-lg border border-purple-500/30">
									<div class="flex items-center gap-3">
										<div class="w-3 h-3 rounded-full ${friend.online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'} "></div>
										<span class="text-white font-normal uppercase">${friend.username}</span>
										<span class="text-xs ${friend.online ? 'text-green-300' : 'text-gray-400'}">${friend.online ? 'ONLINE' : 'OFFLINE'}</span>
										${friend.lastSeen && !friend.online ? `
											<span class="text-xs text-gray-500">• Last seen: ${new Date(friend.lastSeen).toLocaleDateString()}</span>
										` : ''}
									</div>
									${friend.online ? `
										<button class="invite-friend-btn btn-retro px-4 py-2 rounded-lg text-white" data-friend-id="${friend.friend_id}" data-friend-username="${friend.username}">
											 INVITE
										</button>
									` : `
										<button class="px-4 py-2 rounded-lg bg-gray-600/50 text-gray-400 font-normal cursor-not-allowed" disabled>
											OFFLINE
										</button>
									`}
								</div>
							`).join('') : `
								<div class="text-center py-8">
									<div class="text-4xl mb-3 opacity-20">👥</div>
									<div class="text-white/60">No friends found</div>
									<div class="text-sm text-gray-500 mt-2">Add friends to challenge them!</div>
								</div>
							`}
						</div>
					</div>
				</div>

				<!-- Status/Notifications -->
				<div id="statusArea" class="hidden mb-8">
					<div class="bezel rounded-2xl p-6 border">
						<div class="flex items-center gap-3">
							<div class="text-3xl animate-spin">⏳</div>
							<div>
								<h3 class="text-xl neon font-normal">SEARCHING...</h3>
								<p id="statusText" class="text-yellow-200">Looking for available opponents...</p>
							</div>
							<button id="cancelSearchBtn" class="ml-auto btn-retro px-4 py-2 rounded-lg text-white">
								CANCEL
							</button>
						</div>
					</div>
				</div>

				<!-- Back Button -->
				<div class="flex justify-center">
					<button id="backToLobbyBtn" class="btn-retro px-8 py-3 rounded-full text-white"><img class="icon-px icon-px--violet mr-2 align-middle inline" src="/icons/rocket.png" alt="Back" /> BACK TO LOBBY</button>
				</div>
			</div>
		</section>
		`;

		renderUserInfo();
		setupEventListeners();
	}

	function renderUserInfo() {
		const userInfo = root.querySelector<HTMLElement>("#userInfo")!;
		if (user) {
			userInfo.innerHTML = `
				<div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
					<span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
					<span class="text-white font-bold">${user.name}</span>
				</div>
			`;
		} else if (isGuest) {
			userInfo.innerHTML = `
				<div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
					<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
					<span class="text-white font-bold">${state.session.alias}</span>
					<span class="text-xs text-gray-400">GUEST</span>
				</div>
			`;
		} else {
			userInfo.innerHTML = `
				<div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
					<span class="text-gray-400">NOT SIGNED IN</span>
				</div>
			`;
		}
	}

	let isInviting = false; // guard to prevent multiple invites
	function setupEventListeners() {
		// Quick Match
		const quickMatchBtn = root.querySelector<HTMLButtonElement>("#quickMatchBtn");
		if (quickMatchBtn && (signedIn || isGuest)) {
			quickMatchBtn.onclick = () => {
				showStatus("Searching for opponents...");
				// TODO: Implement matchmaking
				setTimeout(() => {
					hideStatus();
					navigate(`/remote/room/${generateRoomCode()}`);
				}, 2000);
			};
		}

		// Friends List
		const friendsBtn = root.querySelector<HTMLButtonElement>("#friendsBtn");
		if (friendsBtn && (signedIn || isGuest)) {
			friendsBtn.onclick = () => {
				const section = root.querySelector("#friendsSection");
				section?.classList.toggle("hidden");
			};
		}

		const closeFriendsBtn = root.querySelector<HTMLButtonElement>("#closeFriendsBtn");
		if (closeFriendsBtn) {
			closeFriendsBtn.onclick = () => {
				const section = root.querySelector("#friendsSection");
				section?.classList.add("hidden");
			};
		}

		// Refresh Friends Button
		const refreshFriendsBtn = root.querySelector<HTMLButtonElement>("#refreshFriendsBtn");
		if (refreshFriendsBtn) {
			refreshFriendsBtn.onclick = async () => {
				console.log('🔄 Manual friends refresh clicked');
				refreshFriendsBtn.textContent = '⏳'; // Show loading
				await refreshFriends();
				refreshFriendsBtn.textContent = '🔄'; // Reset icon
			};
		}

		// Join Room
		const joinRoomBtn = root.querySelector<HTMLButtonElement>("#joinRoomBtn");
		const roomCodeInput = root.querySelector<HTMLInputElement>("#roomCodeInput");
		if (joinRoomBtn && roomCodeInput) {
			joinRoomBtn.onclick = () => {
				const code = roomCodeInput.value.trim().toUpperCase();
				if (code.length === 6) {
					navigate(`/remote/room/${code}`);
				} else {
					showStatus("Please enter a valid 6-character room code", "error");
				}
			};
			roomCodeInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					joinRoomBtn.click();
				}
			});
		}

		// Navigation buttons
		const backBtn = root.querySelector<HTMLButtonElement>("#backBtn");
		const backToLobbyBtn = root.querySelector<HTMLButtonElement>("#backToLobbyBtn");
		[backBtn, backToLobbyBtn].forEach(btn => {
			if (btn) {
				btn.onclick = () => navigate("/");
			}
		});

		// Auth buttons
		const logoutBtn = root.querySelector<HTMLButtonElement>("#logoutBtn");
		if (logoutBtn) {
			logoutBtn.onclick = () => {
				sessionStorage.clear();
				localStorage.clear();
				document.cookie.split(";").forEach(c => {
					document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
				});
				window.dispatchEvent(new CustomEvent("auth:changed"));
				navigate("/");
			};
		}

		const loginBtn = root.querySelector<HTMLButtonElement>("#loginBtn");
		if (loginBtn) {
			loginBtn.onclick = () => navigate("/auth");
		}

		// Cancel search
		const cancelSearchBtn = root.querySelector<HTMLButtonElement>("#cancelSearchBtn");
		if (cancelSearchBtn) {
			cancelSearchBtn.onclick = () => {
				hideStatus();
				// TODO: Cancel matchmaking
			};
		}

		// Friend invitations
		root.querySelectorAll<HTMLButtonElement>('.invite-friend-btn').forEach(btn => {
			console.log('🎮 Found invite button:', btn);
			btn.onclick = async () => {
				if (isInviting) { console.log('⏳ Invite already in progress'); return; }
				console.log('🎮 Invite button clicked!');
				const friendId = btn.getAttribute('data-friend-id');
				const friendUsername = btn.getAttribute('data-friend-username');
				console.log('🎮 friendId from button:', friendId, 'username:', friendUsername);
				if (friendId && friendUsername) {
					try {
						isInviting = true;
						btn.disabled = true;
						btn.textContent = 'CREATING...';
						await inviteFriend(friendId, friendUsername);
					} finally {
						setTimeout(() => { isInviting = false; try { btn.disabled = false; btn.textContent = ' INVITE '; } catch {} }, 1000);
					}
				}
			};
		});
	}

	function showStatus(message: string, type: 'info' | 'error' | 'success' = 'info') {
		const statusArea = root.querySelector("#statusArea");
		const statusText = root.querySelector("#statusText");
		if (statusArea && statusText) {
			statusText.textContent = message;
			statusArea.classList.remove("hidden");
		}
	}

	function hideStatus() {
		const statusArea = root.querySelector("#statusArea");
		statusArea?.classList.add("hidden");
	}

	function generateRoomCode(): string {
		return Math.random().toString(36).substr(2, 6).toUpperCase();
	}

	async function inviteFriend(friendId: string, friendUsername: string) {
		console.log('🎮 inviteFriend called with friendId:', friendId, 'username:', friendUsername);
		// Send invitation to backend (creates a notification for the target)
		const user = getAuth();
		const token = getToken();
		console.log('🎮 user:', user, 'token:', token);
		if (!user) { showStatus('You must be signed in to invite', 'error'); return; }
		try {
			console.log('🎮 About to send POST request to:', `/api/user-service/users/${friendId}/invite`);
			const res = await fetch(`/api/user-service/users/${friendId}/invite`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token || ''}`
				},
				credentials: 'include',
				body: JSON.stringify({ type: 'game_invite' })
			});
			console.log('🎮 Response received:', res.status, res.statusText);
			if (res.ok) {
				const result = await res.json();
				console.log('🎮 Invite result:', result);
				
				if (result.roomCode) {
					console.log('🎮 ✅ Room created:', result.roomCode);
					showStatus('🎮 Room created! Entering...', 'success');
					setTimeout(() => { navigate(`/remote/room/${result.roomCode}`); }, 500);
				} else {
					showStatus('Invitation sent but no room code received', 'error');
				}
			} else if (res.status === 409) {
				// Clean, user-friendly message when target is already in a game
				showStatus('User is currently in a game', 'info');
			} else {
				const err = await res.json().catch(() => ({}));
				console.log('🎮 Error response:', err);
				showStatus(err.error || err.message || 'Failed to send invitation', 'error');
			}
		} catch (err) {
			console.error('🎮 Invite error', err);
			showStatus('Failed to send invitation', 'error');
		}
	}

	// Listen for invite declined to exit waiting room if present
	const onInviteDeclined = (e: Event) => {
		const detail: any = (e as CustomEvent).detail || {};
		console.log('🔔 Invite declined in remote page:', detail);
		// Don't show message here - the notification system already shows it
		hideStatus();
		// If user is in a waiting state, clear it
		const statusArea = root.querySelector("#statusArea");
		if (statusArea && !statusArea.classList.contains("hidden")) {
			hideStatus();
		}
	};
	window.addEventListener('invite:declined', onInviteDeclined as EventListener);

	// Load data (online manager is already initialized in main.ts)
	Promise.all([loadFriends(), loadOnlineUsers()]).then(() => {
		render();
	});

	// Cleanup
	return () => {
		window.removeEventListener('invite:declined', onInviteDeclined as EventListener);
		// Note: Don't destroy online manager here since it's managed globally in main.ts
		console.log('🧹 Remote page cleanup complete');
	};
}