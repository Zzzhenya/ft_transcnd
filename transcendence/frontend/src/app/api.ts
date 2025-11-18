import { API_BASE } from "./config";
import { getToken } from "./auth";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${ensureSlash(path)}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
    credentials: 'include',
  });

  if (res.status === 401) {
	/* TODO: Handle expired token */
  }
  if (!res.ok)
	throw new Error(await safeText(res));

  const isJson = res.headers.get("content-type")?.includes("application/json");
  if (res.status === 204 || !isJson)
	return undefined as unknown as T;
  return res.json() as Promise<T>;
}

function ensureSlash(p: string) { return p.startsWith("/") ? p : `/${p}`; }
async function safeText(r: Response) { try { return await r.text(); } catch { return r.statusText; } }