// frontend/src/pages/profile.ts
import { getAuth, signOut, getToken } from "@/app/auth";
import { navigate } from "@/app/router";
const GATEWAY_BASE = import.meta.env.VITE_GATEWAY_BASE || '/api';

// Keep in sync with app/auth.ts
const STORAGE_KEY = "ft_transcendence_version1";

function readAuthState(): any {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function writeAuthState(s: any) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function updateSessionAuthUser(partialUser: Partial<{ id: string; username: string; email: string; name: string; displayName?: string; alias?: string; role?: string }>, newToken?: string) {
  const s = readAuthState();
  if (!s.auth) s.auth = { user: null, token: null };
  const prev = s.auth.user || {};
  const updated = { ...prev, ...partialUser } as any;
  // Keep name consistent with display preference
  if (updated.display_name && !updated.displayName) {
    updated.displayName = updated.display_name;
  }
  // Prefer display name, then username, as name field used across UI
  if (!updated.name) {
    updated.name = updated.displayName || updated.display_name || updated.username || prev.name;
  } else {
    // If name exists but we changed display fields, refresh it
    updated.name = updated.displayName || updated.display_name || updated.username || updated.name;
  }
  s.auth.user = updated;
  if (newToken) s.auth.token = newToken;
  writeAuthState(s);
  window.dispatchEvent(new CustomEvent('auth:changed'));
}

export default function (root: HTMLElement, ctx?: { url?: URL }) {
  const user = getAuth();
  const currentPath = ctx?.url?.pathname || "/profile";
  if (!user) {
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
    return;
  }

  let friends: any[] = [];
  let onlineUsers: any[] = [];
  let userProfile: any = user;
  let friendRequests: any[] = [];
  let selectedAvatarFile: File | null = null;

  // ⭐ Replace: Update token and user in session storage used by the app
  function updateStoredToken(newToken: string) {
    updateSessionAuthUser({}, newToken);
    console.log('✅ Token updated in session storage');
  }

  // Load complete user profile from database
  async function loadUserProfile() {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`/api/user-service/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
      });
      if (res.ok) {
        userProfile = await res.json();
        // Keep session auth in sync with latest profile
        updateSessionAuthUser({
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          displayName: userProfile.display_name || userProfile.displayName,
          name: (userProfile.display_name || userProfile.displayName || userProfile.username || userProfile.name)
        });
        renderUserInfo();
        updateAvatarDisplay();
      }
    } catch (error) {
      console.log('Could not load user profile:', error);
      userProfile = user;
    }
  }


  function updateAvatarDisplay() {
    const timestamp = Date.now();
    const currentUser = getAuth();
    if (!currentUser) return;

    const mainAvatar = document.getElementById('main-avatar') as HTMLImageElement;
    if (mainAvatar) {
      mainAvatar.src = userProfile.avatar
        ? `${GATEWAY_BASE}/user-service${userProfile.avatar}?t=${timestamp}`
        : `${GATEWAY_BASE}/user-service/avatars/${currentUser.id}.jpg?t=${timestamp}`;
    }

    const headerAvatar = document.getElementById('header-avatar') as HTMLImageElement;
    if (headerAvatar) {
      headerAvatar.src = userProfile.avatar
        ? `${GATEWAY_BASE}/user-service${userProfile.avatar}?t=${timestamp}`
        : `${GATEWAY_BASE}/user-service/avatars/${currentUser.id}.jpg?t=${timestamp}`;
    }
  }


  function renderUserInfo() {
    const userInfoContainer = root.querySelector('#user-info-container');
    if (!userInfoContainer) return;

    userInfoContainer.innerHTML = `
      <div class="flex items-center gap-6 mb-6">
        <!-- Avatar mit Change Button -->
        <div class="relative group">
          <img id="main-avatar"
               src="${userProfile.avatar ? `${GATEWAY_BASE}/user-service${userProfile.avatar}` : `${GATEWAY_BASE}/user-service/avatars/${userProfile.id}.jpg`}" 
               onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICAgIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNkI3MjgwIi8+CiAgICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMzAiIGZpbGw9IiNGRkZGRkYiLz4KICAgIDxlbGxpcHNlIGN4PSIxMDAiIGN5PSIxNTAiIHJ4PSI1MCIgcnk9IjYwIiBmaWxsPSIjRkZGRkZGIi8+CiAgPC9zdmc+'"
               alt="Avatar" 
               class="w-24 h-24 rounded-full object-cover border-4 border-gray-200" />
          ${!userProfile.is_guest ? `
            <button id="change-avatar-btn" 
                    class="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
          ` : ''}
        </div>
        
        <!-- User Info Grid -->
        <div class="flex-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500 mb-1">Display Name</p>
              <div class="flex items-center gap-2">
                <p class="font-semibold text-lg">${userProfile.display_name || userProfile.username || userProfile.name || 'Unknown'}</p>
                ${!userProfile.is_guest ? `
                  <button id="change-display-name-btn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    change
                  </button>
                ` : ''}
              </div>
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-1">User ID</p>
              <p class="font-mono text-sm input-violet px-2 py-1 rounded">${userProfile.id}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500 mb-1">Username</p>
              <div class="flex items-center gap-2">
                <p class="font-semibold">${userProfile.username || 'N/A'}</p>
                ${!userProfile.is_guest ? `
                  <button id="change-username-btn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    change
                  </button>
                ` : ''}
              </div>
            </div>
            <div>
              <p class="text-sm text-gray-500 mb-1">Email</p>
              <div class="flex items-center gap-2">
                <p class="font-semibold">${userProfile.email || 'N/A'}</p>
                ${!userProfile.is_guest ? `
                  <button id="change-email-btn" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    change
                  </button>
                ` : ''}
              </div>
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
        </div>
      </div>

      </div>
    `;

    // Add event listeners
    document.getElementById('change-avatar-btn')?.addEventListener('click', showAvatarModal);
    document.getElementById('change-email-btn')?.addEventListener('click', showEmailModal);
    document.getElementById('change-display-name-btn')?.addEventListener('click', showDisplayNameModal);
    document.getElementById('change-username-btn')?.addEventListener('click', showUsernameModal);
  }

  // ========== AVATAR CHANGE MODAL FUNKTIONEN ==========
  function createAvatarModal() {
    const currentUser = getAuth();
    if (!currentUser) return;

    const timestamp = Date.now();

    const modalHTML = `
      <div id="avatar-modal" class="fixed inset-0 z-50 hidden">
        <div id="avatar-modal-backdrop" class="absolute inset-0 bg-black bg-opacity-50"></div>
        <div class="relative flex items-center justify-center min-h-screen p-4">
          <div class="card-violet rounded-lg border shadow-xl max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl text-gray-200">📷 Change Avatar</h3>
              <button id="close-avatar-modal" class="text-gray-300 hover:text-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div class="space-y-4">
              <!-- Preview -->
              <div class="flex justify-center">
                <div class="relative">
                  <img id="avatar-preview" 
                      src="${userProfile.avatar ? `${GATEWAY_BASE}/user-service${userProfile.avatar}?t=${timestamp}` : `${GATEWAY_BASE}/user-service/avatars/${currentUser.id}.jpg?t=${timestamp}`}" 
                      class="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMDAgMjAwIj4KICAgIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNkI3MjgwIi8+CiAgICA8Y2lyY2xlIGN4PSIxMDAiIGN5PSI3MCIgcj0iMzAiIGZpbGw9IiNGRkZGRkYiLz4KICAgIDxlbGxpcHNlIGN4PSIxMDAiIGN5PSIxNTAiIHJ4PSI1MCIgcnk9IjYwIiBmaWxsPSIjRkZGRkZGIi8+CiAgPC9zdmc+'"
                      alt="Avatar preview" />
                  <div class="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700">
                    <label for="avatar-input" class="cursor-pointer">
                      <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      </svg>
                    </label>
                  </div>
                </div>
              </div>
              
              <!-- Hidden file input -->
              <input type="file" 
                    id="avatar-input" 
                    accept="image/jpeg,image/jpg,image/png,image/gif" 
                    class="hidden" />
              
              <p class="text-xs text-gray-500 text-center">
                Click camera icon to select image<br>
                Max 2MB • JPG, PNG or GIF
              </p>
              
              <p id="avatar-error" class="text-red-500 text-sm text-center hidden"></p>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button id="cancel-avatar-btn" class="flex-1 px-4 py-2 border rounded-lg font-normal transition-colors card-violet">
                Cancel
              </button>
              <button id="save-avatar-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400"
                      disabled>
                Save Avatar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    // Event listeners
    document.getElementById('avatar-input')?.addEventListener('change', handleAvatarSelect);
    document.getElementById('close-avatar-modal')?.addEventListener('click', hideAvatarModal);
    document.getElementById('avatar-modal-backdrop')?.addEventListener('click', hideAvatarModal);
    document.getElementById('cancel-avatar-btn')?.addEventListener('click', hideAvatarModal);
    document.getElementById('save-avatar-btn')?.addEventListener('click', uploadAvatar);
  }

  function showAvatarModal() {
    const existingModal = document.getElementById('avatar-modal');
    if (existingModal) {
      existingModal.remove();
    }
    if (!document.getElementById('avatar-modal')) {
      createAvatarModal();
    }
    document.getElementById('avatar-modal')?.classList.remove('hidden');
    selectedAvatarFile = null;

    // Reset save button
    const saveBtn = document.getElementById('save-avatar-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
    }
  }

  function hideAvatarModal() {
    document.getElementById('avatar-modal')?.classList.add('hidden');
    selectedAvatarFile = null;
  }

  function handleAvatarSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const errorEl = document.getElementById('avatar-error');
    errorEl?.classList.add('hidden');

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      if (errorEl) {
        errorEl.textContent = 'File size must be less than 2MB';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      if (errorEl) {
        errorEl.textContent = 'Please select a JPG, PNG or GIF image';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    selectedAvatarFile = file;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('avatar-preview') as HTMLImageElement;
      if (preview && e.target?.result) {
        preview.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);

    // Enable save button
    const saveBtn = document.getElementById('save-avatar-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = false;
    }
  }

  async function uploadAvatar() {
    if (!selectedAvatarFile) {
      const errorEl = document.getElementById('avatar-error');
      if (errorEl) {
        errorEl.textContent = 'Please select an image first';
        errorEl.classList.remove('hidden');
      }
      return;
    }

    const currentUser = getAuth();
    if (!currentUser) {
      showMessage('Not authenticated', 'error');
      return;
    }

    const saveBtn = document.getElementById('save-avatar-btn') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Uploading...';
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const token = getToken();
        const res = await fetch(`${GATEWAY_BASE}/user-service/users/${currentUser.id}/avatar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`
          },
          credentials: 'include',
          body: JSON.stringify({
            imageData: base64
          })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showMessage('Avatar updated successfully!', 'success');
          await loadUserProfile();
          hideAvatarModal();
          selectedAvatarFile = null;
        } else {
          const errorEl = document.getElementById('avatar-error');
          if (errorEl) {
            errorEl.textContent = data.error || 'Failed to upload avatar';
            errorEl.classList.remove('hidden');
          }

          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Avatar';
          }
        }
      };

      reader.readAsDataURL(selectedAvatarFile);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      showMessage('Failed to upload avatar', 'error');

      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Avatar';
      }
    }
  }

  // ========== EMAIL CHANGE MODAL FUNKTIONEN ==========
  function createEmailModal() {
    const modalHTML = `
      <div id="email-modal" class="fixed inset-0 z-50 hidden">
        <!-- Backdrop -->
        <div id="email-modal-backdrop" class="absolute inset-0 bg-black bg-opacity-50"></div>
        <!-- Modal -->
        <div class="relative flex items-center justify-center min-h-screen p-4">
          <div class="card-violet rounded-lg border shadow-xl max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl text-gray-200">📧 Change Email</h3>
              <button id="close-email-modal" class="text-gray-300 hover:text-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label for="new-email" class="block text-sm font-medium text-gray-700 mb-1">New Email</label>
                <input 
                  type="email" 
                  id="new-email" 
                  class="w-full px-3 py-2 input-violet rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="Enter new email address"
                />
                <p id="email-error" class="text-red-500 text-sm mt-1 hidden"></p>
              </div>
              <div>
                <label for="confirm-password-email" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input 
                  type="password" 
                  id="confirm-password-email" 
                  class="w-full px-3 py-2 input-violet rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="Enter your password to confirm"
                />
                <p id="password-error-email" class="text-red-500 text-sm mt-1 hidden"></p>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button id="cancel-email-btn" class="flex-1 px-4 py-2 border rounded-lg font-normal transition-colors card-violet">
                Cancel
              </button>
              <button id="save-email-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    document.getElementById('close-email-modal')?.addEventListener('click', hideEmailModal);
    document.getElementById('email-modal-backdrop')?.addEventListener('click', hideEmailModal);
    document.getElementById('cancel-email-btn')?.addEventListener('click', hideEmailModal);
    document.getElementById('save-email-btn')?.addEventListener('click', updateEmail);
  }

  function showEmailModal() {
    if (!document.getElementById('email-modal')) {
      createEmailModal();
    }
    document.getElementById('email-modal')?.classList.remove('hidden');
  }

  function hideEmailModal() {
    document.getElementById('email-modal')?.classList.add('hidden');
  }

  async function updateEmail() {
    const emailInput = document.getElementById('new-email') as HTMLInputElement;
    const passwordInput = document.getElementById('confirm-password-email') as HTMLInputElement;
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error-email');

    emailError?.classList.add('hidden');
    passwordError?.classList.add('hidden');

    const newEmail = emailInput?.value?.trim();
    const password = passwordInput?.value;

    if (!newEmail) {
      if (emailError) {
        emailError.textContent = 'Please enter a new email address';
        emailError.classList.remove('hidden');
      }
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      if (emailError) {
        emailError.textContent = 'Please enter a valid email address';
        emailError.classList.remove('hidden');
      }
      return;
    }

    if (!password) {
      if (passwordError) {
        passwordError.textContent = 'Please enter your password to confirm';
        passwordError.classList.remove('hidden');
      }
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          newEmail,
          password
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMessage('Email updated successfully!', 'success');
        userProfile.email = newEmail;
        renderUserInfo();
        hideEmailModal();
        return;
      }

      if (data.error) {
        if (data.error.includes('password')) {
          if (passwordError) {
            passwordError.textContent = data.error;
            passwordError.classList.remove('hidden');
          }
        } else if (data.error.includes('already')) {
          if (emailError) {
            emailError.textContent = data.error;
            emailError.classList.remove('hidden');
          }
        } else {
          showMessage(data.error, 'error');
        }
      } else {
        showMessage('Failed to update email', 'error');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      showMessage('Failed to update email. Please try again.', 'error');
    }
  }

  // ⭐ UPDATED: DISPLAY NAME CHANGE MODAL WITH TOKEN HANDLING
  function createDisplayNameModal() {
    const modalHTML = `
      <div id="display-name-modal" class="fixed inset-0 z-50 hidden">
        <div id="display-name-modal-backdrop" class="absolute inset-0 bg-black bg-opacity-50"></div>
        <div class="relative flex items-center justify-center min-h-screen p-4">
          <div class="card-violet rounded-lg border shadow-xl max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl text-gray-200">✏️ Change Display Name</h3>
              <button id="close-display-name-modal" class="text-gray-300 hover:text-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label for="new-display-name" class="block text-sm font-medium text-gray-700 mb-1">New Display Name</label>
                <input 
                  type="text" 
                  id="new-display-name" 
                  class="w-full px-3 py-2 input-violet rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="Enter new display name"
                  value="${userProfile.display_name || userProfile.username || ''}"
                  maxlength="50"
                />
                <p class="text-xs text-gray-500 mt-1">Max 50 characters</p>
                <p id="display-name-error" class="text-red-500 text-sm mt-1 hidden"></p>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button id="cancel-display-name-btn" class="flex-1 px-4 py-2 border rounded-lg font-normal transition-colors card-violet">
                Cancel
              </button>
              <button id="save-display-name-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    document.getElementById('close-display-name-modal')?.addEventListener('click', hideDisplayNameModal);
    document.getElementById('display-name-modal-backdrop')?.addEventListener('click', hideDisplayNameModal);
    document.getElementById('cancel-display-name-btn')?.addEventListener('click', hideDisplayNameModal);
    document.getElementById('save-display-name-btn')?.addEventListener('click', updateDisplayName);
  }

  function showDisplayNameModal() {
    if (!document.getElementById('display-name-modal')) {
      createDisplayNameModal();
    }
    document.getElementById('display-name-modal')?.classList.remove('hidden');
  }

  function hideDisplayNameModal() {
    document.getElementById('display-name-modal')?.classList.add('hidden');
  }

  // ⭐ UPDATED: Display name update with token handling
  async function updateDisplayName() {
    const displayNameInput = document.getElementById('new-display-name') as HTMLInputElement;
    const displayNameError = document.getElementById('display-name-error');

    displayNameError?.classList.add('hidden');

    const newDisplayName = displayNameInput?.value?.trim();

    if (!newDisplayName) {
      if (displayNameError) {
        displayNameError.textContent = 'Please enter a new display name';
        displayNameError.classList.remove('hidden');
      }
      return;
    }

    if (newDisplayName.length > 50) {
      if (displayNameError) {
        displayNameError.textContent = 'Display name must be 50 characters or less';
        displayNameError.classList.remove('hidden');
      }
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/display-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          displayName: newDisplayName
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // ⭐ Update session auth user and token
        updateSessionAuthUser({ display_name: newDisplayName, displayName: newDisplayName, name: newDisplayName }, data.token);

        showMessage('Display name updated successfully!', 'success');
        userProfile.display_name = newDisplayName;
        renderUserInfo();
        hideDisplayNameModal();
        return;
      }

      showMessage(data.error || 'Failed to update display name', 'error');
    } catch (error) {
      console.error('Error updating display name:', error);
      showMessage('Failed to update display name. Please try again.', 'error');
    }
  }

  // ⭐ UPDATED: USERNAME CHANGE MODAL WITH TOKEN HANDLING
  function createUsernameModal() {
    const modalHTML = `
      <div id="username-modal" class="fixed inset-0 z-50 hidden">
        <div id="username-modal-backdrop" class="absolute inset-0 bg-black bg-opacity-50"></div>
        <div class="relative flex items-center justify-center min-h-screen p-4">
          <div class="card-violet rounded-lg border shadow-xl max-w-md w-full p-6">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl text-gray-200">👤 Change Username</h3>
              <button id="close-username-modal" class="text-gray-300 hover:text-gray-100">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="space-y-4">
              <div>
                <label for="new-username" class="block text-sm font-medium text-gray-700 mb-1">New Username</label>
                <input 
                  type="text" 
                  id="new-username" 
                  class="w-full px-3 py-2 input-violet rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                  placeholder="Enter new username"
                  value="${userProfile.username || ''}"
                  maxlength="20"
                />
                <p class="text-xs text-gray-500 mt-1">3-20 characters, only letters, numbers, and underscores</p>
                <p id="username-error" class="text-red-500 text-sm mt-1 hidden"></p>
              </div>
            </div>
            <div class="flex gap-3 mt-6">
              <button id="cancel-username-btn" class="flex-1 px-4 py-2 border rounded-lg font-normal transition-colors card-violet">
                Cancel
              </button>
              <button id="save-username-btn" class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container);

    document.getElementById('close-username-modal')?.addEventListener('click', hideUsernameModal);
    document.getElementById('username-modal-backdrop')?.addEventListener('click', hideUsernameModal);
    document.getElementById('cancel-username-btn')?.addEventListener('click', hideUsernameModal);
    document.getElementById('save-username-btn')?.addEventListener('click', updateUsername);
  }

  function showUsernameModal() {
    if (!document.getElementById('username-modal')) {
      createUsernameModal();
    }
    document.getElementById('username-modal')?.classList.remove('hidden');
  }

  function hideUsernameModal() {
    document.getElementById('username-modal')?.classList.add('hidden');
  }

  // ⭐ UPDATED: Username update with token handling
  async function updateUsername() {
    const usernameInput = document.getElementById('new-username') as HTMLInputElement;
    const usernameError = document.getElementById('username-error');

    usernameError?.classList.add('hidden');

    const newUsername = usernameInput?.value?.trim();

    if (!newUsername) {
      if (usernameError) {
        usernameError.textContent = 'Please enter a new username';
        usernameError.classList.remove('hidden');
      }
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      if (usernameError) {
        usernameError.textContent = 'Username must be between 3 and 20 characters';
        usernameError.classList.remove('hidden');
      }
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      if (usernameError) {
        usernameError.textContent = 'Username can only contain letters, numbers, and underscores';
        usernameError.classList.remove('hidden');
      }
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // ⭐ Update session auth user and token. Name falls back to username if no display name
        updateSessionAuthUser({ username: newUsername, name: userProfile.display_name || userProfile.displayName || newUsername }, data.token);

        showMessage('Username updated successfully!', 'success');
        userProfile.username = newUsername;
        renderUserInfo();
        hideUsernameModal();
        return;
      }

      if (data.error?.includes('already')) {
        if (usernameError) {
          usernameError.textContent = data.error;
          usernameError.classList.remove('hidden');
        }
      } else {
        showMessage(data.error || 'Failed to update username', 'error');
      }
    } catch (error) {
      console.error('Error updating username:', error);
      showMessage('Failed to update username. Please try again.', 'error');
    }
  }

  // Load incoming friend requests
  async function loadFriendRequests() {
    if (!user) return;

    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/friend-requests`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        friendRequests = data.requests || [];
        renderFriendRequestsSection();
      }
    } catch (error) {
      console.error('Exception in loadFriendRequests:', error);
    }
  }

  // Accept or reject friend request
  async function respondToFriendRequest(requesterId: number, action: 'accept' | 'reject') {
    if (!user) return;
    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/friend-requests/${requesterId}`, {
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
        await loadFriendRequests();
        await loadFriends();
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
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/friends`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
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
      const res = await fetch(`${GATEWAY_BASE}/user-service/users/${userProfile.id}/friends`, {
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
      const res = await fetch(`/api/user-service/users/online`);
      if (res.ok) {
        const data = await res.json();
        onlineUsers = data.users || [];
      }
    } catch (error) {
      console.log('Could not load online users:', error);
    }
  }

  // DELETE ACCOUNT FUNCTION
  async function deleteAccount() {
    if (!user) return;

    const confirmed = confirm(
      '⚠️ Are you sure you want to delete your account?\n\n' +
      'This action will:\n' +
      '• Mark your account as deleted\n' +
      '• Add "deleted_" prefix to your username\n' +
      '• Log you out immediately\n\n' +
      'This action cannot be undone. Do you want to continue?'
    );

    if (!confirmed) {
      showMessage('Account deletion cancelled', 'info');
      return;
    }

    try {
      const token = getToken();
      const res = await fetch(`${GATEWAY_BASE}/user-service/auth/account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || ''}`
        },
        credentials: 'include'
      });

      if (res.ok) {
        const result = await res.json();
        showMessage('Account successfully deleted. Logging out...', 'success');

        setTimeout(async () => {
          await signOut();
          navigate('/auth');
        }, 2000);
      } else {
        const error = await res.json();
        showMessage(error.message || 'Failed to delete account', 'error');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      showMessage('Failed to delete account. Please try again.', 'error');
    }
  }

  function showMessage(message: string, type: 'success' | 'error' | 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `fixed top-4 right-4 px-6 py-3 rounded-lg font-semibold z-50 transition-all transform translate-x-0 ${type === 'success' ? 'bg-green-500 text-white' :
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
          <div class="flex items-center justify-between p-4 card-violet rounded-lg border">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
              <div>
                <span class="font-semibold text-gray-200">${request.username}</span>
                <div class="text-xs text-gray-400">
                  Sent: ${new Date(request.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="accept-request-btn px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all" data-requester-id="${request.id}">
                Accept
              </button>
              <button class="reject-request-btn px-3 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-semibold transition-all" data-requester-id="${request.id}">
                Reject
              </button>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-6 text-gray-400">
            <div class="mb-3 opacity-50 flex justify-center">
              <img src="/icons/message.png" class="icon-px icon-px--violet" alt="No requests">
            </div>
            <p class="font-semibold">No pending friend requests</p>
            <p class="text-sm">You're all caught up!</p>
          </div>
        `}
      </div>
    `;

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
          <div class="flex items-center justify-between p-4 card-violet rounded-lg border">
            <div class="flex items-center gap-3">
              <div class="w-3 h-3 rounded-full ${friend.friends_status === 'accepted' ? 'bg-green-400' : friend.friends_status === 'pending' ? 'bg-yellow-400' : 'bg-gray-500'}"></div>
              <div>
                <span class="font-semibold title-yellow">${friend.username || 'Unknown User'}</span>
                <div class="text-xs text-gray-400">
                  Status: ${friend.friends_status} • Added: ${new Date(friend.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div class="text-right">
              ${friend.friends_status === 'accepted' ? `
                <span class="chip chip-green">Friends</span>
              ` : friend.friends_status === 'pending' ? `
                <span class="chip chip-yellow">Pending</span>
              ` : `
                <span class="chip chip-red">${friend.friends_status}</span>
              `}
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-400">
            <div class="mb-3 opacity-50 flex justify-center">
              <img src="/icons/people.png" class="icon-px icon-px--violet" alt="No friends">
            </div>
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
        <h1 class="text-2xl sm:text-3xl lg:text-4xl font-bold title-yellow flex items-center gap-2">
          <img src="/icons/profile.png" class="icon-px icon-px--yellow" alt="Profile">
          Profile
        </h1>
        <div class="flex gap-2">
          <button id="delete-account-btn" class="px-4 py-2 rounded-lg bg-red-800 hover:bg-red-900 text-white font-semibold transition-colors">
            Delete Account
          </button>
          <button id="logout" class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">
            Sign Out
          </button>
        </div>
      </div>

      <!-- User Info Section -->
      <div class="card-violet rounded-lg p-6 mb-8">
        <div id="user-info-container">
          <!-- User info will be loaded here -->
        </div>
      </div>

      <!-- Friend Requests Section -->
      <div class="card-violet rounded-lg border p-6 shadow-sm mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl title-violet flex items-center gap-2">
            <img src="/icons/message.png" class="icon-px icon-px--violet" alt="Friend Requests">
            Friend Requests
          </h2>
          <span class="text-sm text-gray-300">${friendRequests.length} pending</span>
          <button id="refresh-requests-btn" class="text-sm link-violet">
            Refresh
          </button>
        </div>
        
        <div id="friend-requests-container" class="min-h-[80px]">
          <div class="text-center py-4 text-gray-500">
            Loading friend requests...
          </div>
        </div>
      </div>

      <!-- Friends Management Section -->
      <div class="card-violet rounded-lg border p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl title-violet flex items-center gap-2">
            <img src="/icons/people.png" class="icon-px icon-px--violet" alt="Friends Management">
            Friends Management
          </h2>
          <button id="refresh-friends-btn" class="text-sm link-violet">
             Refresh
          </button>
        </div>
        
        <!-- Add Friend Form -->
        <div class="card-violet rounded-lg p-4 mb-6 border">
          <h3 class="mb-3"> Add New Friend</h3>
          <div class="flex gap-3">
            <input id="friend-username-input" type="text" 
                   class="flex-1 px-3 py-2 input-violet rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none" 
                   placeholder="Enter friend's username" />
            <button id="add-friend-btn" class="px-6 py-2 btn-retro rounded-lg transition-colors">
              Add Friend
            </button>
          </div>
          <p class="text-xs text-gray-300 mt-2">
             Enter the exact username of the player you want to add as a friend.
          </p>
        </div>
        
        <!-- Friends List -->
        <div>
          <h3 class="mb-3 text-gray-200">Your Friends (${friends.length})</h3>
          <div id="friends-container" class="min-h-[100px]">
            <div class="text-center py-4 text-gray-400">
              Loading friends...
            </div>
          </div>
        </div>
      </div>
      <!-- Navigation Section -->
      <div class="flex flex-wrap gap-3">
        <button id="dashboard-btn" class="btn-retro px-8 py-3 rounded-full text-white flex items-center gap-2"><img class="icon-px icon-px--violet" src="/icons/dashboard.png" alt="Dashboard" /> Dashboard</button>
        <a href="/" class="btn-retro px-8 py-3 rounded-full text-white flex items-center gap-2"><img class="icon-px icon-px--violet" src="/icons/lobby.png" alt="Lobby" /> 
          Go to Lobby
        </a>
        <a href="/remote" class="btn-retro px-8 py-3 rounded-full text-white flex items-center gap-2"><img class="icon-px icon-px--violet" src="/icons/rocket.png" alt="Remote" /> 
          Remote Play
        </a>
        <button id="backBtn" class="btn-retro px-8 py-3 rounded-full text-white flex items-center gap-2"><img class="icon-px icon-px--violet" src="/icons/trophy.png" alt="Tournaments" /> Tournament Lobby</button>
      </div>
    </section>
  `;

  // Event Listeners
  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    await signOut();
    navigate(`/auth?next=${encodeURIComponent(currentPath)}`);
  });

  root.querySelector<HTMLButtonElement>("#delete-account-btn")?.addEventListener("click", async () => {
    await deleteAccount();
  });

  root.querySelector<HTMLButtonElement>("#backBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/tournaments");
  });

  root.querySelector<HTMLButtonElement>("#dashboard-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/dashboard");
  });

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

  root.querySelector<HTMLInputElement>("#friend-username-input")?.addEventListener("keypress", (e) => {
    if (e.key === 'Enter') {
      root.querySelector<HTMLButtonElement>("#add-friend-btn")?.click();
    }
  });

  root.querySelector<HTMLButtonElement>("#refresh-requests-btn")?.addEventListener("click", () => {
    loadFriendRequests();
  });


  root.querySelector<HTMLButtonElement>("#refresh-friends-btn")?.addEventListener("click", () => {
    loadFriends();
  });

  // Load data on page load
  try {
    loadUserProfile();
    loadFriendRequests();
    loadFriends();
    loadOnlineUsers();
  } catch (error) {
    console.error('Error during page load:', error);
  }
}