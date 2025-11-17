function required<K extends keyof ImportMetaEnv>(k: K): string {
	const v = import.meta.env[k];
	if (!v)
		throw new Error(`[config] Missing ${k}`);
	return v;
}

export const API_BASE = required("VITE_API_BASE");
// Ensure WS_BASE always points to the gateway websocket prefix (/ws) with correct protocol
export const WS_BASE  = (() => {
  const env = required("VITE_WS_BASE");
  // If env already includes ws path or absolute URL, use as-is
  try {
    const u = new URL(env, window.location.origin);
    // Normalize protocol based on current page
    const desiredProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (u.protocol !== 'ws:' && u.protocol !== 'wss:') {
      u.protocol = desiredProtocol;
    }
    // Ensure path starts with /ws
    if (!u.pathname.startsWith('/ws')) {
      u.pathname = `/ws${u.pathname === '/' ? '' : u.pathname}`;
    }
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch (_e) {
    // If env is a bare path like "/ws" just prefix host
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const path = env.startsWith('/ws') ? env : `/ws${env.startsWith('/') ? '' : '/'}${env}`;
    return `${proto}://${host}${path}`;
  }
})();
export const GATEWAY_BASE = required("VITE_GATEWAY_BASE");