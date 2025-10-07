const STORAGE_KEY = "ft_transcendence_version1";

export type AuthUser = { id: string; name: string; role?: "user" | "admin" };

type RootState = {
  auth?: { user: AuthUser | null };
  [k: string]: any; // maintain for current status
};

function read(): RootState {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function write(s: RootState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function getAuth(): AuthUser | null {
  return read()?.auth?.user ?? null;
}

export async function mockSignIn(name: string) {
  const s = read();
  if (!s.auth) s.auth = { user: null };
  s.auth.user = { id: `mock-${Date.now()}`, name };
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
}

export async function mockSignOut() {
  const s = read();
  if (!s.auth) s.auth = { user: null };
  s.auth.user = null;
  write(s);
  dispatchEvent(new CustomEvent("auth:changed"));
}