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
			const res = await fetch(`/api/user-service/users/online`);
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
		<section class="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-900 to-slate-950 py-6 px-4">
			<div class="max-w-6xl mx-auto">
				
				<!-- Header -->
				<div class="text-center mb-6">
					<div class="flex justify-between items-center mb-4 px-4">
						<button id="backBtn" class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-all">
							← Back
						</button>
						${signedIn ? `
							<button id="logoutBtn" class="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-semibold transition-all">
								Logout
							</button>
						` : isGuest ? `
							<button id="loginBtn" class="px-4 py-2 rounded-lg bg-green-500/80 hover:bg-green-600 text-white font-semibold transition-all">
								Sign In
							</button>
						` : `
							<button id="loginBtn" class="px-4 py-2 rounded-lg bg-green-500/80 hover:bg-green-600 text-white font-semibold transition-all">
								Sign In
							</button>
						`}
					</div>
					<div class="text-5xl mb-2 filter drop-shadow-2xl">🌐</div>
					<h1 class="text-4xl font-black text-white mb-3 tracking-tight">
						REMOTE PLAY
					</h1>
					<div id="userInfo" class="flex justify-center mb-4"></div>
					<p class="text-lg text-gray-300 font-medium">
						Challenge friends or find opponents worldwide!
					</p>
				</div>

				<!-- Game Mode Cards -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					
					<!-- Quick Match -->
					<div class="group relative bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30 hover:border-green-400/50 hover:bg-gradient-to-br hover:from-green-500/30 hover:to-emerald-600/30 transition-all duration-300">
						<div class="text-center">
							<div class="text-6xl mb-4 group-hover:scale-110 transition-transform">⚡</div>
							<h2 class="text-2xl font-black text-white mb-2">QUICK MATCH</h2>
							<p class="text-green-200 text-sm mb-4">Find a random opponent instantly</p>
							<div class="text-xs text-green-300 font-bold mb-4">
								🟢 ${onlineUsers.length} players online
							</div>
							<button id="quickMatchBtn" class="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50 ${(!signedIn && !isGuest) ? "opacity-30 cursor-not-allowed" : ""}" ${(!signedIn && !isGuest) ? "disabled" : ""}>
								⚡ FIND MATCH
							</button>
						</div>
					</div>

					<!-- Play with Friends -->
					<div class="group relative bg-gradient-to-br from-blue-500/20 to-cyan-600/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 hover:border-blue-400/50 hover:bg-gradient-to-br hover:from-blue-500/30 hover:to-cyan-600/30 transition-all duration-300">
						<div class="text-center">
							<div class="text-6xl mb-4 group-hover:scale-110 transition-transform">👥</div>
							<h2 class="text-2xl font-black text-white mb-2">FRIENDS</h2>
							<p class="text-blue-200 text-sm mb-4">Challenge your friends</p>
							<div class="text-xs text-blue-300 font-bold mb-4">
								👥 ${friends.filter(f => f.online).length} friends online
							</div>
							<button id="friendsBtn" class="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white font-black transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 ${(!signedIn && !isGuest) ? "opacity-30 cursor-not-allowed" : ""}" ${(!signedIn && !isGuest) ? "disabled" : ""}>
								👥 VIEW FRIENDS
							</button>
						</div>
					</div>

					<!-- Join Room -->
					<div class="group relative bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30 hover:border-purple-400/50 hover:bg-gradient-to-br hover:from-purple-500/30 hover:to-pink-600/30 transition-all duration-300">
						<div class="text-center">
							<div class="text-6xl mb-4 group-hover:scale-110 transition-transform">🔐</div>
							<h2 class="text-2xl font-black text-white mb-2">JOIN ROOM</h2>
							<p class="text-purple-200 text-sm mb-4">Enter a room code</p>
							<div class="mb-4">
								<input id="roomCodeInput" type="text" 
									placeholder="ROOM CODE" 
									class="w-full px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 font-mono text-center uppercase font-bold focus:border-purple-400 focus:outline-none"
									maxlength="6" />
							</div>
							<button id="joinRoomBtn" class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-black transition-all transform hover:scale-105 shadow-lg hover:shadow-purple-500/50">
								🔐 JOIN ROOM
							</button>
						</div>
					</div>
				</div>

				<!-- Friends List (expandable) -->
				<div id="friendsSection" class="hidden mb-8">
					<div class="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
						<div class="flex items-center justify-between mb-4">
							<h3 class="text-2xl font-black text-white">🧑‍🤝‍🧑 FRIENDS LIST</h3>
							<div class="flex items-center gap-3">
								<button id="refreshFriendsBtn" class="text-blue-400 hover:text-blue-300 transition-colors text-xl" title="Refresh friend status">
									🔄
								</button>
								<button id="closeFriendsBtn" class="text-white/60 hover:text-white transition-colors text-2xl">✕</button>
							</div>
						</div>
						
						<!-- Add Friend Form -->
						<div class="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
							<div class="flex items-center gap-3">
								<input id="friendUsernameInput" type="text" 
									placeholder="Enter username to add friend" 
									class="flex-1 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:border-blue-400 focus:outline-none" />
								<button id="addFriendBtn" class="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all">
									➕ Add Friend
								</button>
							</div>
						</div>
						<div id="friendsList" class="space-y-3">
							${friends.length > 0 ? friends.map(friend => `
								<div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
									<div class="flex items-center gap-3">
										<div class="w-3 h-3 rounded-full ${friend.online ? 'bg-green-400 animate-pulse' : 'bg-gray-500'} "></div>
										<span class="text-white font-bold">${friend.username}</span>
										<span class="text-xs ${friend.online ? 'text-green-300' : 'text-gray-400'}">${friend.online ? 'ONLINE' : 'OFFLINE'}</span>
										${friend.lastSeen && !friend.online ? `
											<span class="text-xs text-gray-500">• Last seen: ${new Date(friend.lastSeen).toLocaleDateString()}</span>
										` : ''}
									</div>
									${friend.online ? `
										<button class="invite-friend-btn px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all" data-friend-id="${friend.friend_id}">
											🎮 INVITE
										</button>
									` : `
										<button class="px-4 py-2 rounded-lg bg-gray-600/50 text-gray-400 font-semibold cursor-not-allowed" disabled>
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
					<div class="bg-gradient-to-r from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/30">
						<div class="flex items-center gap-3">
							<div class="text-3xl animate-spin">⏳</div>
							<div>
								<h3 class="text-xl font-black text-white">Searching...</h3>
								<p id="statusText" class="text-yellow-200">Looking for available opponents...</p>
							</div>
							<button id="cancelSearchBtn" class="ml-auto px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white font-semibold transition-all">
								Cancel
							</button>
						</div>
					</div>
				</div>

				<!-- Back Button -->
				<div class="flex justify-center">
					<button id="backToLobbyBtn" class="px-8 py-3 rounded-full bg-white/10 backdrop-blur-sm text-white font-bold hover:bg-white/20 transition-all">
						← BACK TO LOBBY
					</button>
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

		// Add Friend
		const addFriendBtn = root.querySelector<HTMLButtonElement>("#addFriendBtn");
		const friendUsernameInput = root.querySelector<HTMLInputElement>("#friendUsernameInput");
		if (addFriendBtn && friendUsernameInput && (signedIn || isGuest)) {
			addFriendBtn.onclick = async () => {
				const username = friendUsernameInput.value.trim();
				if (username) {
					await addFriend(username);
					friendUsernameInput.value = ''; // Clear input after adding
				} else {
					showMessage('Please enter a username', 'error');
				}
			};
			friendUsernameInput.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					addFriendBtn.click();
				}
			});
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
			btn.onclick = () => {
				console.log('🎮 Invite button clicked!');
				const friendId = btn.getAttribute('data-friend-id');
				console.log('🎮 friendId from button:', friendId);
				if (friendId) {
					inviteFriend(friendId);
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

	function inviteFriend(friendId: string) {
		console.log('🎮 inviteFriend called with friendId:', friendId);
		// Send invitation to backend (creates a notification for the target)
		(async () => {
			const user = getAuth();
			const token = getToken();
			console.log('🎮 user:', user, 'token:', token);
			if (!user) { showStatus('You must be signed in to invite', 'error'); return; }
			try {
				console.log('🔥 DEBUG: About to send invite request');
				console.log('🔥 DEBUG: URL:', `/api/user-service/users/${friendId}/invite`);
				console.log('🔥 DEBUG: Headers:', {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token || ''}`,
				});
				console.log('🔥 DEBUG: Body:', JSON.stringify({ type: 'game_invite' }));
				
				console.log('🎮 About to send POST request to:', `/api/user-service/users/${friendId}/invite`);
				const res = await fetch(`/api/user-service/users/${friendId}/invite`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token || ''}`
					},
					body: JSON.stringify({ type: 'game_invite' })
				});
				
				console.log('🔥 DEBUG: Fetch completed');
				console.log('🔥 DEBUG: Response status:', res.status);
				console.log('🔥 DEBUG: Response ok:', res.ok);
				console.log('🔥 DEBUG: Response headers:', res.headers);
				
				console.log('🎮 Response received:', res.status, res.statusText);
				if (res.ok) {
					const result = await res.json();
					console.log('🎮 Invite result:', result);
					
					// 🔥 CHANGED: Just show success message, DON'T go to room yet
					showStatus('Invitation sent! Waiting for acceptance...', 'success');
					
					// Store the room code to join later when invitation is accepted
					if (result.roomCode) {
						console.log('🎮 Room code created:', result.roomCode, '- waiting for acceptance');
						console.log('🎮 Toast notification system will handle acceptance automatically');
						// The toast-notifications.ts system will automatically detect acceptance and navigate
					}
				} else {
					const err = await res.json().catch(() => ({}));
					console.log('🎮 Error response:', err);
					showStatus(err.message || 'Failed to send invitation', 'error');
				}
			} catch (err) {
				console.error('🎮 Invite error', err);
				showStatus('Failed to send invitation', 'error');
			}
		})();
	}

	// Load data (online manager is already initialized in main.ts)
	Promise.all([loadFriends(), loadOnlineUsers()]).then(() => {
		render();
	});

	// Cleanup
	return () => {
		// Note: Don't destroy online manager here since it's managed globally in main.ts
		console.log('🧹 Remote page cleanup complete');
	};
}