import { signMessage, verifySignature, generateSecp256k1KeyPair } from './utils/crypto';
import { getActiveKey, addKey, setActiveKey, isOriginAllowed } from './utils/storage';

type BridgeRequest = {
  type: string;
  requestId: string;
  message?: Uint8Array;
  didKey?: string;
  signature?: Uint8Array;
};

type BridgeResponse = {
  type: string;
  requestId: string;
  ok: boolean;
  error?: string;
  didKey?: string;
  verified?: boolean;
  signature?: Uint8Array;
}

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
  if (!requestId) {
    console.warn('[Bridge] Missing requestId');
    return;
  }

  if (data.type === 'PING') {
    const res: BridgeResponse = { type: 'PONG', requestId, ok: true };
    postReply(event, res);
    return;
  }

  if (data.type === 'getDIDKey') {
    const key = getActiveKey();
    if (!key?.didKey) {
      const res: BridgeResponse = { type: 'getDIDKey:result', requestId, ok: false, error: 'no_active_key' };
      postReply(event, res);
      return;
    }
    const res: BridgeResponse = { type: 'getDIDKey:result', requestId, ok: true, didKey: key?.didKey };
    postReply(event, res);
    return;
  }

  if (data.type === 'signMessage') {
    try {
      const key = getActiveKey();
      if (!key?.privateKey) {
        const res: BridgeResponse = { type: 'signMessage:result', requestId, ok: false, error: 'no_local_key' };
        postReply(event, res);
        return;
      }
      const msgBytes = data.message as Uint8Array | undefined;
      if (!msgBytes) {
        const res: BridgeResponse = { type: 'signMessage:result', requestId, ok: false, error: 'empty_message' };
        postReply(event, res);
        return;
      }
      const sigBytes = await signMessage(msgBytes, key.privateKey);
      const res: BridgeResponse = {
        type: 'signMessage:result',
        requestId,
        ok: true,
        signature: sigBytes,
      };
      postReply(event, res);
    } catch {
      const res: BridgeResponse = { type: 'signMessage:result', requestId, ok: false, error: 'sign_failed' };
      postReply(event, res);
    }
    return;
  }

  if (data.type === 'generateKey') {
    try {
      const keyPair = await generateSecp256k1KeyPair();
      const entry = addKey({ ...keyPair, createdAt: Date.now() }, `Key (quest)`);
      setActiveKey(entry.id);
      const res: BridgeResponse = { type: 'generateKey:result', requestId, ok: true, didKey: keyPair.didKey };
      postReply(event, res);
    } catch {
      const res: BridgeResponse = { type: 'generateKey:result', requestId, ok: false, error: 'generate_failed' };
      postReply(event, res);
    }
    return;
  }

  if (data.type === 'verifySignature') {
    try {
      const didKey = typeof data.didKey === 'string' ? data.didKey.trim() : undefined;
      if (!didKey) {
        const res: BridgeResponse = { type: 'verifySignature:result', requestId, ok: false, error: 'missing_didKey' };
        postReply(event, res);
        return;
      }
      const msgBytes = data.message as Uint8Array | undefined;
      const sigBytes = data.signature as Uint8Array | undefined;
      if (!msgBytes || !sigBytes) {
        const res: BridgeResponse = { type: 'verifySignature:result', requestId, ok: false, error: 'missing_payload' };
        postReply(event, res);
        return;
      }
      const verified = await verifySignature(msgBytes, sigBytes, didKey);
      const res: BridgeResponse = { type: 'verifySignature:result', requestId, ok: true, verified };
      postReply(event, res);
    } catch {
      const res: BridgeResponse = { type: 'verifySignature:result', requestId, ok: false, error: 'verify_failed' };
      postReply(event, res);
    }
  }
});

