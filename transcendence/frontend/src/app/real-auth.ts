const STORAGE_KEY = "ft_transcendence_version1";
const API_BASE = "http://localhost:3000/user-service"; // Gateway URL

export type AuthUser = {
	id: string;
	username: string;
	email: string;
	name: string;
	role?: "user" | "admin"
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
export async function register(username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`${API_BASE}/auth/register`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, email, password })
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.message || data.error || 'Registration failed'
			};
		}

		// After successful registration, auto-login
		if (data.token) {
			const s = read();
			if (!s.auth) s.auth = { user: null, token: null };
			s.auth.user = {
				id: data.user.id,
				username: data.user.username,
				email: data.user.email,
				name: data.user.username, // Use username as display name
				role: "user"
			};
			s.auth.token = data.token;
			write(s);
			dispatchEvent(new CustomEvent("auth:changed"));
			return { success: true };
		}

		return { success: true };
	} catch (error) {
		console.error('Register error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Network error'
		};
	}
}

// Sign in existing user
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(`${API_BASE}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ email, password })
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.message || data.error || 'Login failed'
			};
		}

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
	} catch (error) {
		console.error('Sign in error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Network error'
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

// Get user profile (example of authenticated request)
export async function getProfile(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
	try {
		const token = getToken();
		if (!token) {
			return { success: false, error: 'Not authenticated' };
		}

		const response = await fetch(`${API_BASE}/auth/profile`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
			},
		});

		const data = await response.json();

		if (!response.ok) {
			return {
				success: false,
				error: data.message || data.error || 'Failed to get profile'
			};
		}

		return {
			success: true,
			user: {
				id: data.id,
				username: data.username,
				email: data.email,
				name: data.username,
				role: "user"
			}
		};
	} catch (error) {
		console.error('Get profile error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Network error'
		};
	}
}
//ADD_RK-------------------------------
// Guest Login
	export async function guestLogin(alias?: string): Promise<{ success: boolean; error?: string }> {
		try {
			console.log('🎮 Guest login with alias:', alias || 'auto-generated');
			
			const response = await fetch(`${API_BASE}/auth/guest`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ alias: alias || undefined })
			});

			const data = await response.json();
			
			console.log('Guest login response:', data);

			if (!response.ok || !data.success) {
				return {
					success: false,
					error: data.message || data.error || 'Guest login failed'
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

			console.log('✅ Guest user created in DB with ID:', data.user.id);

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
//-------------------------------