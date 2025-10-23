import { api } from "./api";
const STORAGE_KEY = "ft_transcendence_version1";

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

// Get user profile (example of authenticated request)
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