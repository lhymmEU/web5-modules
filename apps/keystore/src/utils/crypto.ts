import { Secp256k1Keypair, verifySignature as verifySignatureAtproto } from '@atproto/crypto';

// Helper functions for hex conversion
export function bytesToHex(bytes: Uint8Array): string {
    const hex: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
        const current = bytes[i] < 16 ? '0' + bytes[i].toString(16) : bytes[i].toString(16);
        hex.push(current);
    }
    return hex.join('');
}

export function hexToBytes(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) throw new Error('hex string length must be even');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

export interface KeyPair {
  privateKey: string;
  didKey: string;
}

export const generateSecp256k1KeyPair = async (): Promise<KeyPair> => {
    const keypair = await Secp256k1Keypair.create({ exportable: true });

    return {
        privateKey: bytesToHex(await keypair.export()),
        didKey: keypair.did(), // Returns did:key format which includes public key
    };
};

export const importSecp256k1KeyPair = async (privateKeyHex: string): Promise<KeyPair> => {
    const keypair = await Secp256k1Keypair.import(hexToBytes(privateKeyHex));

    return {
        privateKey: privateKeyHex,
        didKey: keypair.did(), // Returns did:key format which includes public key
    };
};

export const signMessage = async (message: Uint8Array, privateKeyHex: string): Promise<Uint8Array> => {
    const keypair = await Secp256k1Keypair.import(hexToBytes(privateKeyHex));
    const signature = await keypair.sign(message);
    return signature;
};

export const verifySignature = async (message: Uint8Array, signature: Uint8Array, didKey: string): Promise<boolean> => {
  return verifySignatureAtproto(didKey, message, signature);
};

export const getKey = async (password: string, saltBuffer: ArrayBuffer): Promise<CryptoKey> => {
  const enc = new TextEncoder().encode(password);
  const baseKey = await window.crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptData = async (data: string, password: string): Promise<string> => {
  try {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await getKey(password, salt.buffer);
    const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);
    let s = '';
    for (let i = 0; i < combined.length; i++) s += String.fromCharCode(combined[i]);
    return btoa(s);
  } catch {
    return 'error';
  }
};

export const decryptData = async (encryptedData: string, password: string): Promise<string> => {
  try {
    const binary = atob(encryptedData);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i);

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await getKey(password, salt.buffer);
    const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return 'error';
  }
};
