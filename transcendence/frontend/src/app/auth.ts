// frontend/src/app/auth.ts
import { api } from "./api";
import { API_BASE } from "./config";
const STORAGE_KEY = "ft_transcendence_version1";

export type AuthUser = {
	id: string;
	username: string;
	email: string;
	name: string;
	displayName?: string;
	alias?: string;
	role?: "user" | "admin";
};

type RootState = {
	auth?: {
		user: AuthUser | null;
		token: string | null;
	};
	[k: string]: any;
};

function read(): RootState {
	try {
		return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
	} catch {
		return {};
	}
}

function write(s: RootState) {
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getAuth(): AuthUser | null {
	return read()?.auth?.user ?? null;
}

export function getToken(): string | null {
	return read()?.auth?.token ?? null;
}

// Register new user
export async function register(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const data = await api<{ token?: string; user: any }>(
			"/auth/register",
			{ method: "POST", body: JSON.stringify({ username, email, password }) }
		);

		if (data?.token) {
			const s = read();
			if (!s.auth) s.auth = { user: null, token: null };
			s.auth.user = {
				id: data.user.id,
				username: data.user.username,
				email: data.user.email,
				name: data.user.username,
				role: "user",
			};
			s.auth.token = data.token;
			write(s);
			dispatchEvent(new CustomEvent("auth:changed"));
			return { success: true };
		}
		return { success: true };

	} catch (error) {
		console.error("Register error:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Network error",
		};
	}
}

// Sign in
export async function signIn(
	email: string,
	password: string
): Promise<{ success: boolean; error?: string }> {
  try {
	const data = await api<{ token: string; user: any }>(
	  "/auth/login",
	  { method: "POST", body: JSON.stringify({ email, password }) }
	);

	const s = read();
	if (!s.auth) s.auth = { user: null, token: null };
	s.auth.user = {
	  id: data.user.id,
	  username: data.user.username,
	  email: data.user.email,
	  name: data.user.username,
	  role: "user",
	};
	s.auth.token = data.token;
	write(s);
	dispatchEvent(new CustomEvent("auth:changed"));

	return { success: true };
  } catch (error) {
	console.error("Sign in error:", error);
	return {
	  success: false,
	  error: error instanceof Error ? error.message : "Network error",
	};
  }
}

// Sign out
export async function signOut() {
  const s = read();
  if (!s.auth) s.auth = { user: null, token: null };
  s.auth.user = null;
  s.auth.token = null;
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
}

export async function ensureFreshAuth(): Promise<void> {
	const initial = read();
	const persistedAuth = initial.auth;
	if (!persistedAuth?.user)
		return;

	try {
		const response = await fetch(`${API_BASE}/auth/profile`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				...(persistedAuth.token ? { Authorization: `Bearer ${persistedAuth.token}` } : {}),
			},
		});

		if (response.status === 401 || response.status === 403 || response.status === 404) {
			await signOut();
			return;
		}

		if (!response.ok)
			return;

		const isJson = response.headers.get("content-type")?.includes("application/json");
		if (!isJson)
			return;

		const data = await response.json() as { id: string; username: string; email: string };
		const previousUser = persistedAuth.user;
		const nextUser: AuthUser = {
			...previousUser,
			id: data.id,
			username: data.username,
			email: data.email,
			name: previousUser?.name ?? data.username,
			role: previousUser?.role ?? "user",
		};

		const hasUserChanged = !previousUser ||
			previousUser.id !== nextUser.id ||
			previousUser.username !== nextUser.username ||
			previousUser.email !== nextUser.email;

		const updatedState = read();
		if (!updatedState.auth) updatedState.auth = { user: null, token: null };
		updatedState.auth.user = nextUser;
		updatedState.auth.token = persistedAuth.token ?? null;
		write(updatedState);

		if (hasUserChanged)
			dispatchEvent(new CustomEvent("auth:changed"));
	} catch (error) {
		console.warn("Failed to verify user session", error);
		await signOut();
	}
}

// Guest Login
export async function guestLogin(alias?: string): Promise<{ success: boolean; error?: string }> {
	try {
		console.log('🎮 Guest login with alias:', alias || 'auto-generated');
		
		const data = await api<{ success: boolean; token: string; user: any; message?: string }>(
			"/auth/guest",
			{ method: "POST", body: JSON.stringify({ alias: alias || undefined }) }
		);

		if (!data.success) {
			return {
				success: false,
				error: data.message || 'Guest login failed'
			};
		}

		// Save guest user data to sessionStorage
		const s = read();
		if (!s.auth) s.auth = { user: null, token: null };
		s.auth.user = {
			id: data.user.id,
			username: data.user.username,
			email: data.user.email,
			name: data.user.username,
			role: "user"
		};
		s.auth.token = data.token;
		write(s);
		dispatchEvent(new CustomEvent("auth:changed"));
		return { success: true };
	} 
	catch (error) {
		console.error('❌ Guest login error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Network error'
		};
	}
}

// Get user profile
export async function getProfile(): Promise<{
  success: boolean;
  user?: AuthUser;
  error?: string;
}> {
  try {
	const data = await api<{ id: string; username: string; email: string }>(
	  "/auth/profile",
	  { method: "GET" }
	);

	return {
	  success: true,
	  user: {
		id: data.id,
		username: data.username,
		email: data.email,
		name: data.username,
		role: "user",
	  },
	};
  } catch (error) {
	console.error("Get profile error:", error);
	return {
	  success: false,
	  error: error instanceof Error ? error.message : "Network error",
	};
  }
}

// Online status management
export async function setOnlineStatus(isOnline: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const user = getAuth();
    const token = getToken();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`🔄 Setting online status for user ${user.id} to ${isOnline}`);

    // Import GATEWAY_BASE directly
    const { GATEWAY_BASE } = await import('./config');
    
    const response = await fetch(`${GATEWAY_BASE}/user-service/users/${user.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      },
      body: JSON.stringify({ is_online: isOnline ? 1 : 0 }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log(`✅ Online status updated successfully`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating online status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

// Set user online when app starts
export async function setUserOnline(): Promise<void> {
  await setOnlineStatus(true);
}

// Set user offline when app closes
export async function setUserOffline(): Promise<void> {
  await setOnlineStatus(false);
}

// Auto-manage online status
export function initOnlineStatusManager(): () => void {
  const user = getAuth();
  if (!user) return () => {};

  // Set online immediately
  setUserOnline();

  // Set offline on page unload
  const handleUnload = () => {
    setUserOffline();
  };

  // Handle visibility change (tab switching)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched tabs or minimized window
      setTimeout(() => {
        if (document.hidden) {
          setUserOffline();
        }
      }, 30000); // Wait 30 seconds before setting offline
    } else {
      // User came back to the tab
      setUserOnline();
    }
  };

  // Add event listeners
  window.addEventListener('beforeunload', handleUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Heartbeat to keep user online (every 5 minutes)
  const heartbeat = setInterval(() => {
    if (!document.hidden) {
      setUserOnline();
    }
  }, 5 * 60 * 1000); // 5 minutes

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(heartbeat);
    setUserOffline();
  };
}