// frontend/src/pages/profile.ts
import { getAuth, signOut, getToken } from "@/app/auth";
import { navigate } from "@/app/router";
import { GATEWAY_BASE } from "@/app/config";

export default function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  // If not logged in, redirect to auth with next param set to current path
  const currentPath = ctx?.url?.pathname || "/profile";
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  let friends: any[] = [];
  let onlineUsers: any[] = [];
  let userProfile: any = user; // Start with cached user data
  let friendRequests: any[] = []; // Incoming friend requests

  // Load complete user profile from database
  async function loadUserProfile() {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
      });
      if (res.ok) {
        userProfile = await res.json();
        renderUserInfo();
      }
    } catch (error) {
      console.log('Could not load user profile:', error);
      userProfile = user; // Fallback to cached user
    }
  }

  function renderUserInfo() {
    const userInfoContainer = root.querySelector('#user-info-container');
    if (!userInfoContainer) return;

    userInfoContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500 mb-1">Display Name</p>
          <p class="font-semibold text-lg">${userProfile.username || userProfile.name || 'Unknown'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">User ID</p>
          <p class="font-mono text-sm bg-gray-100 px-2 py-1 rounded">${userProfile.id}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Username</p>
          <p class="font-semibold">${userProfile.username || 'N/A'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Email</p>
          <p class="font-semibold">${userProfile.email || 'N/A'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Member Since</p>
          <p class="font-semibold">${userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-1">Account Type</p>
          <p class="font-semibold">${userProfile.is_guest ? 'Guest' : 'Registered'}</p>
        </div>
      </div>
    `;
  }

  // Load incoming friend requests
  async function loadFriendRequests() {
    console.log('🎯 loadFriendRequests() START');
    
    if (!user) {
      console.log('❌ No user available, user is:', user);
      return;
    }
    
    console.log('✅ User found:', user);
    
    try {
      const token = getToken();
      console.log('Token status:', token ? '✅ Present' : '❌ Missing');
      
      const url = `${GATEWAY_BASE}/user-service/users/${user.id}/friend-requests`;
      console.log('🌐 URL:', url);
      
      console.log('📡 Making fetch request...');
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
      });
      
      console.log('📄 Response received. Status:', res.status);
      
      if (res.ok) {
        console.log('✅ Response OK, parsing JSON...');
        const data = await res.json();
        console.log('� Data:', data);
        friendRequests = data.requests || [];
        console.log('� Friend requests count:', friendRequests.length);
        renderFriendRequestsSection();
        console.log('🎨 Render completed');
      } else {
        console.error('❌ Request failed with status:', res.status);
      }
    } catch (error) {
      console.error('🚫 Exception in loadFriendRequests:', error);
    }
    
    console.log('🎯 loadFriendRequests() END');
  }

  // Accept or reject friend request
  async function respondToFriendRequest(requesterId: number, action: 'accept' | 'reject') {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/friend-requests/${requesterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      
      if (res.ok) {
        const data = await res.json();
        showMessage(data.message, 'success');
        await loadFriendRequests(); // Reload requests
        await loadFriends(); // Reload friends list
        renderFriendRequestsSection();
        renderFriendsSection();
      } else {
        const error = await res.json();
        showMessage(error.message || `Failed to ${action} friend request`, 'error');
      }
    } catch (error) {
      console.log(`Could not ${action} friend request:`, error);
      showMessage(`Failed to ${action} friend request`, 'error');
    }
  }

  // Friends management functions
  async function loadFriends() {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/friends`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        friends = data.friends || [];
        renderFriendsSection();
      }
    } catch (error) {
      console.log('Could not load friends:', error);
    }
  }

  async function addFriend(username: string) {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/friends`, {
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
        await loadFriends();
      } else {
        const error = await res.json();
        showMessage(error.error || 'Failed to add friend', 'error');
      }
    } catch (error) {
      console.log('Could not add friend:', error);
      showMessage('Failed to add friend', 'error');
    }
  }

  async function loadOnlineUsers() {
    try {
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/online`);
      if (res.ok) {
        const data = await res.json();
        onlineUsers = data.users || [];
      }
    } catch (error) {
      console.log('Could not load online users:', error);
    }
  }

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

  function renderFriendRequestsSection() {
    const requestsContainer = root.querySelector('#friend-requests-container');
    if (!requestsContainer) return;

    requestsContainer.innerHTML = `
      <div class="space-y-3">
        ${friendRequests.length > 0 ? friendRequests.map(request => `
          <div class="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
              <div>
                <span class="font-semibold text-yellow-800">${request.username}</span>
                <div class="text-xs text-yellow-600">
                  Sent: ${new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="accept-request-btn px-3 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-all" data-requester-id="${request.id}">
                ✅ Accept
              </button>
              <button class="reject-request-btn px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-all" data-requester-id="${request.id}">
                ❌ Reject
              </button>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-6 text-gray-500">
            <div class="text-4xl mb-3 opacity-20">📨</div>
            <p class="font-semibold">No pending friend requests</p>
            <p class="text-sm">You're all caught up!</p>
          </div>
        `}
      </div>
    `;

    // Add event listeners for accept/reject buttons
    root.querySelectorAll<HTMLButtonElement>('.accept-request-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const requesterId = parseInt(btn.getAttribute('data-requester-id') || '0');
        await respondToFriendRequest(requesterId, 'accept');
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.reject-request-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const requesterId = parseInt(btn.getAttribute('data-requester-id') || '0');
        await respondToFriendRequest(requesterId, 'reject');
      });
    });
  }

  function renderFriendsSection() {
    const friendsContainer = root.querySelector('#friends-container');
    if (!friendsContainer) return;

    friendsContainer.innerHTML = `
      <div class="space-y-3">
        ${friends.length > 0 ? friends.map(friend => `
          <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full ${friend.status === 'accepted' ? 'bg-green-400' : friend.status === 'pending' ? 'bg-yellow-400' : 'bg-gray-400'}"></div>
              <div>
                <span class="font-semibold">${friend.username || 'Unknown User'}</span>
                <div class="text-xs text-gray-500">
                  Status: ${friend.status} • Added: ${new Date(friend.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div class="text-right">
              ${friend.status === 'accepted' ? `
                <span class="text-xs text-green-600 font-semibold px-2 py-1 rounded-full bg-green-100">✅ Friends</span>
              ` : friend.status === 'pending' ? `
                <span class="text-xs text-yellow-600 font-semibold px-2 py-1 rounded-full bg-yellow-100">⏳ Pending</span>
              ` : `
                <span class="text-xs text-gray-400 px-2 py-1 rounded-full bg-gray-100">❌ ${friend.status}</span>
              `}
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <div class="text-6xl mb-3 opacity-20">👥</div>
            <p class="font-semibold text-lg">No friends yet</p>
            <p class="text-sm">Add some friends to play together!</p>
          </div>
        `}
      </div>
    `;
  }

  root.innerHTML = `
    <section class="py-6 md:py-8 lg:py-10 space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold">👤 Profile</h1>
        <div class="flex gap-2">
          <button id="logout" class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <!-- User Info Section -->
            <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div class="flex items-center mb-6">
          <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
            ${userProfile.name?.charAt(0).toUpperCase() || userProfile.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-800">${userProfile.name || userProfile.username || 'Usuario'}</h2>
            <p class="text-gray-600">${userProfile.email || 'Sin email'}</p>
          </div>
        </div>
        
        <div id="user-info-container">
          <!-- User info will be loaded here -->
        </div>
      </div>

      <!-- Friend Requests Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-800">📨 Friend Requests</h2>
          <span class="text-sm text-gray-500">${friendRequests.length} pending</span>
        </div>
        
        <div id="friend-requests-container" class="min-h-[80px]">
          <div class="text-center py-4 text-gray-500">
            Loading friend requests...
          </div>
        </div>
      </div>

      <!-- Friends Management Section -->
      <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-800">👥 Friends Management</h2>
          <button id="refresh-friends-btn" class="text-sm text-blue-600 hover:text-blue-800 font-semibold">
            🔄 Refresh
          </button>
        </div>
        
        <!-- Add Friend Form -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 class="font-semibold mb-3 text-blue-800">➕ Add New Friend</h3>
          <div class="flex gap-3">
            <input id="friend-username-input" type="text" 
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                   placeholder="Enter friend's username" />
            <button id="add-friend-btn" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
              Add Friend
            </button>
          </div>
          <p class="text-xs text-gray-600 mt-2">
            💡 Enter the exact username of the player you want to add as a friend.
          </p>
        </div>
        
        <!-- Friends List -->
        <div>
          <h3 class="font-semibold mb-3 text-gray-800">Your Friends (${friends.length})</h3>
          <div id="friends-container" class="min-h-[100px]">
            <div class="text-center py-4 text-gray-500">
              Loading friends...
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Section -->
      <div class="flex flex-wrap gap-3">
        <a href="/" class="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">
          🏠 Go to Lobby
        </a>
        <a href="/remote" class="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors">
          🌐 Remote Play
        </a>
        <button id="backBtn" class="px-6 py-3 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-semibold transition-colors">
          🏆 Tournament Lobby
        </button>
      </div>
    </section>
  `;

  // Event Listeners
  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
  });

  root.querySelector<HTMLButtonElement>("#backBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/tournaments");
  });

  // Add Friend functionality
  root.querySelector<HTMLButtonElement>("#add-friend-btn")?.addEventListener("click", async () => {
    const usernameInput = root.querySelector<HTMLInputElement>("#friend-username-input");
    const username = usernameInput?.value?.trim();
    if (username) {
      await addFriend(username);
      if (usernameInput) usernameInput.value = '';
    } else {
      showMessage('Please enter a username', 'error');
    }
  });

  // Enter key handler for add friend input
  root.querySelector<HTMLInputElement>("#friend-username-input")?.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
      root.querySelector<HTMLButtonElement>("#add-friend-btn")?.click();
    }
  });

  // Refresh friends button
  root.querySelector<HTMLButtonElement>("#refresh-friends-btn")?.addEventListener("click", () => {
    loadFriends();
  });

  // Load data on page load
  console.log('🎯 PROFILE PAGE LOADED - Starting data loading...');
  
  try {
    console.log('1️⃣ Loading user profile...');
    loadUserProfile();
    
    console.log('2️⃣ Loading friend requests...');
    loadFriendRequests();
    
    console.log('3️⃣ Loading friends...');
    loadFriends();
    
    console.log('4️⃣ Loading online users...');
    loadOnlineUsers();
    
    console.log('✅ All loading functions called successfully');
  } catch (error) {
    console.error('❌ Error during page load:', error);
  }
}