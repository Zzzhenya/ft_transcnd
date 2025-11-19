function required<K extends keyof ImportMetaEnv>(k: K): string {
	const v = import.meta.env[k];
	if (!v)
		throw new Error(`[config] Missing ${k}`);
	return v;
}

export const API_BASE = required("VITE_API_BASE");

// WebSocket base URL - always use same-origin with correct protocol
export const WS_BASE = (() => {
  // Derive protocol from current page: https -> wss, http -> ws
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Always use /ws path for WebSocket connections through nginx
  return `${wsProtocol}//${host}/ws`;
})();
export const GATEWAY_BASE = required("VITE_GATEWAY_BASE");