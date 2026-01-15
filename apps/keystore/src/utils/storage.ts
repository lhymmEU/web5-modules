// Based on https://github.com/web5fans/web5fans.github.io/blob/ccc-sdk/src/utils/storage.ts

export const STORAGE_KEY_SIGNING_KEY = 'web5_keystore_signing_key';
export const STORAGE_KEY_WHITELIST = 'web5_keystore_origin_whitelist';

export const DEFAULT_WHITELIST = [
  'http://localhost:3000', // Console App
  'http://localhost:3001', // Keystore App itself
];

export interface SigningKeyData {
  privateKey: string;
  didKey: string;
  createdAt: number;
}

export const saveSigningKey = (keyData: SigningKeyData): void => {
  localStorage.setItem(STORAGE_KEY_SIGNING_KEY, JSON.stringify(keyData));
};

export const getSigningKey = (): SigningKeyData | null => {
  const data = localStorage.getItem(STORAGE_KEY_SIGNING_KEY);
  return data ? JSON.parse(data) : null;
};

export const deleteSigningKey = (): void => {
    localStorage.removeItem(STORAGE_KEY_SIGNING_KEY);
}

// Whitelist Management
export const getStoredWhitelist = (): string[] => {
  const data = localStorage.getItem(STORAGE_KEY_WHITELIST);
  return data ? JSON.parse(data) : [];
};

export const saveStoredWhitelist = (list: string[]): void => {
  localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(list));
};

export const isOriginAllowed = (origin: string): boolean => {
  if (DEFAULT_WHITELIST.includes(origin)) return true;
  const stored = getStoredWhitelist();
  return stored.includes(origin);
};

export const addOriginToWhitelist = (origin: string): void => {
  const stored = getStoredWhitelist();
  if (!stored.includes(origin) && !DEFAULT_WHITELIST.includes(origin)) {
    stored.push(origin);
    saveStoredWhitelist(stored);
  }
};

export const removeOriginFromWhitelist = (origin: string): void => {
  // Cannot remove default whitelist items via this method, logic handled in UI or here?
  // User can only remove what they added.
  const stored = getStoredWhitelist();
  const newList = stored.filter(o => o !== origin);
  saveStoredWhitelist(newList);
};

