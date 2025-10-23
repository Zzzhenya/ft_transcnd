function required<K extends keyof ImportMetaEnv>(k: K): string {
	const v = import.meta.env[k];
	if (!v)
		throw new Error(`[config] Missing ${k}`);
	return v;
}

export const API_BASE = required("VITE_API_BASE");
export const WS_BASE  = required("VITE_WS_BASE");
export const GATEWAY_BASE = required("VITE_GATEWAY_BASE");