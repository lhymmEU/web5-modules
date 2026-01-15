import { bytesToHex, hexToBytes, signMessage, verifySignature } from './utils/crypto';
import { getSigningKey, isOriginAllowed } from './utils/storage';

type BridgeRequest = {
  type?: unknown;
  requestId?: unknown;
  message?: unknown;
  messageHex?: unknown;
  messageBase64?: unknown;
  didKey?: unknown;
  signatureHex?: unknown;
  signatureBase64?: unknown;
};

const base64ToBytes = (s: string): Uint8Array => {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

const getMessageBytes = (data: BridgeRequest): Uint8Array => {
  if (typeof data.messageHex === 'string' && data.messageHex.trim()) return hexToBytes(data.messageHex.trim());
  if (typeof data.messageBase64 === 'string' && data.messageBase64.trim()) return base64ToBytes(data.messageBase64.trim());
  if (typeof data.message === 'string') return new TextEncoder().encode(data.message);
  return new Uint8Array();
};

const getSignatureBytes = (data: BridgeRequest): Uint8Array => {
  if (typeof data.signatureHex === 'string' && data.signatureHex.trim()) return hexToBytes(data.signatureHex.trim());
  if (typeof data.signatureBase64 === 'string' && data.signatureBase64.trim()) return base64ToBytes(data.signatureBase64.trim());
  return new Uint8Array();
};

const postReply = (event: MessageEvent, payload: unknown) => {
  const target = event.source as WindowProxy | null;
  if (!target) return;
  // console.log('[Bridge] Replying:', payload);
  target.postMessage(payload, event.origin);
};

window.addEventListener('message', async (event: MessageEvent) => {
  const origin = event.origin;
  if (!isOriginAllowed(origin)) {
    console.warn(`[Bridge] Blocked request from unauthorized origin: ${origin}`);
    // Silently ignore or maybe post error back? 
    // Requirement: "如果调用者不在白名单里的话就不通信" -> Ignore.
    return;
  }

  const data = event.data as BridgeRequest;
  if (!data || typeof data !== 'object') return;
  if (typeof data.type !== 'string') return;
  
  // console.log('[Bridge] Received:', data.type, data);

  const requestId = typeof data.requestId === 'string' ? data.requestId : undefined;

  if (data.type === 'PING') {
    postReply(event, { type: 'PONG', requestId });
    return;
  }

  if (data.type === 'getDIDKey') {
    const key = getSigningKey();
    postReply(event, { type: 'getDIDKey:result', requestId, ok: Boolean(key?.didKey), didKey: key?.didKey ?? null });
    return;
  }

  if (data.type === 'signMessage') {
    try {
      const key = getSigningKey();
      if (!key?.privateKey) {
        postReply(event, { type: 'signMessage:result', requestId, ok: false, error: 'no_local_key' });
        return;
      }
      const msgBytes = getMessageBytes(data);
      if (msgBytes.length === 0) {
        postReply(event, { type: 'signMessage:result', requestId, ok: false, error: 'empty_message' });
        return;
      }
      const sigBytes = await signMessage(msgBytes, key.privateKey);
      postReply(event, {
        type: 'signMessage:result',
        requestId,
        ok: true,
        signatureHex: bytesToHex(sigBytes),
        signatureBase64: bytesToBase64(sigBytes),
      });
    } catch {
      postReply(event, { type: 'signMessage:result', requestId, ok: false, error: 'sign_failed' });
    }
    return;
  }

  if (data.type === 'verifySignature') {
    try {
      const didKey = typeof data.didKey === 'string' ? data.didKey.trim() : '';
      if (!didKey) {
        postReply(event, { type: 'verifySignature:result', requestId, ok: false, error: 'missing_didKey' });
        return;
      }
      const msgBytes = getMessageBytes(data);
      const sigBytes = getSignatureBytes(data);
      if (msgBytes.length === 0 || sigBytes.length === 0) {
        postReply(event, { type: 'verifySignature:result', requestId, ok: false, error: 'missing_payload' });
        return;
      }
      const ok = await verifySignature(msgBytes, sigBytes, didKey);
      postReply(event, { type: 'verifySignature:result', requestId, ok });
    } catch {
      postReply(event, { type: 'verifySignature:result', requestId, ok: false, error: 'verify_failed' });
    }
  }
});

