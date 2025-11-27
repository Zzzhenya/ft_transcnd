// frontend/src/app/auth.ts
import { api } from "./api";
import { reportOnlineOnce, reportOffline } from "@/utils/efficient-online-status";
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

// Helper to populate user state from profile
export async function loadProfile(): Promise<boolean> {
  const profile = await getProfile();
  if (!profile.success || !profile.user) return false;

  const s = read();
  s.auth = { user: profile.user };
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
  return true;
}

// Register new user
export async function register(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
	try {
		const data = await api(
			"/auth/register",
			{ method: "POST", body: JSON.stringify({ username, email, password }) }
		);
		
		// fetch profile
		// const ok = await getProfile();
		// const ok = await loadUserProfile();
		const ok = await loadProfile();
		if (!ok){
			return { success: false, error: "Failed to fetch user profile after registration" };
		}
		await reportOnlineOnce();
		return { success: true };

	} catch (error) {
		// console.error("Register error:", error);
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

  	const data = await api(
	  "/auth/login",
	  { method: "POST", body: JSON.stringify({ email, password }), credentials: 'include' }
	  );

	// Fetch fresh profile
  	// const ok = await loadUserProfile();
  	const ok = await loadProfile();
  	if (!ok) return { success: false, error: "Failed to fetch user profile" };
	await reportOnlineOnce();
	return { success: true };
  } catch (error) {
  	// should we?
		// console.error("Sign in error:", error);
	return {
	  success: false,
	  error: error instanceof Error ? error.message : "Network error",
	};
  }
}

// Sign out
export async function signOut() {

	try	{
		console.log('🎮 User logout: set user offline');
		await reportOffline();
		console.log('🎮 User logout');
		const data = await api("/auth/logout", { method: "POST", credentials: 'include', body: JSON.stringify({}) });
  	// Report offline first (centralized here so all callers inherit it)
  } catch {
  	// ignore errors
  }
  const s = read();
  s.auth = {user: null}
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
}

// clearOut
export async function clearOut() {

	try	{
		console.log('🎮 Session clear: set user offline');
		await reportOffline();
		console.log('🎮 Session clean');
		const data = await api("/auth/clear", { method: "POST", credentials: 'include', body: JSON.stringify({}) });
  	// Report offline first (centralized here so all callers inherit it)
  } catch {
  	// ignore errors
  }
  const s = read();
  s.auth = {user: null}
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
}

// Guest Login
export async function guestLogin(alias?: string): Promise<{ success: boolean; error?: string }> {
	try {
		console.log('🎮 Guest login with alias:', alias || 'auto-generated');
		const data = await api(
			"/auth/guest",
			{ method: "POST", body: JSON.stringify({ alias: alias || undefined }) }
		);
    
		// const ok = await loadUserProfile();
		const ok = await loadProfile();
    	if (!ok) return { success: false, error: "Failed to fetch user profile" };

    	await reportOnlineOnce();
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

// Online status management (legacy). Presence is now handled explicitly via reportOnlineOnce/reportOffline
export async function setOnlineStatus(isOnline: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const user = getAuth();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`🔄 Setting online status for user ${user.id} to ${isOnline}`);

    await api(`/users/${user.id}/status`, {
      method: "POST",
      body: JSON.stringify({ is_online: isOnline ? 1 : 0 }),
    });

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
// Disabled to avoid multi-tab interference during testing; presence handled in signIn/signOut
return () => {};
}