// Use environment variables or fallback to local dev defaults
export const KEY_STORE_URL = import.meta.env.VITE_KEYSTORE_URL || 'http://localhost:3001';
export const KEY_STORE_BRIDGE_URL = `${KEY_STORE_URL}/bridge.html`;
