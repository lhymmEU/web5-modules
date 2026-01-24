
export type BridgeRequest = {
  type: string;
  requestId: string;
  message?: Uint8Array;
  didKey?: string;
  signature?: Uint8Array;
};

export type BridgeResponse = {
  type: string;
  requestId: string;
  ok: boolean;
  error?: string;
  didKey?: string;
  verified?: boolean;
  signature?: Uint8Array;
}

export class KeystoreClient {
  private iframe: HTMLIFrameElement | null = null;
  private bridgeUrl: string;
  private pendingRequests = new Map<string, { resolve: (val: BridgeResponse) => void; reject: (err: Error) => void }>();

  constructor(bridgeUrl: string) {
    if (!bridgeUrl) {
      throw new Error('Bridge URL is required');
    }
    this.bridgeUrl = bridgeUrl;
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.iframe) {
        resolve();
        return;
      }

      this.iframe = document.createElement('iframe');
      this.iframe.src = this.bridgeUrl;
      // Use visibility:hidden instead of display:none to ensure loading in all browsers
      this.iframe.style.position = 'absolute';
      this.iframe.style.width = '0';
      this.iframe.style.height = '0';
      this.iframe.style.border = 'none';
      this.iframe.style.visibility = 'hidden';

      window.addEventListener('message', this.handleMessage);

      const loadTimeout = setTimeout(() => {
        reject(new Error('Iframe load timeout (5s)'));
      }, 5000);

      // Wait for iframe load then PING to confirm ready
      this.iframe.onload = async () => {
        clearTimeout(loadTimeout);
        try {
          // Give bridge a moment to initialize its listeners
          await new Promise(r => setTimeout(r, 500));
          await this.ping();
          resolve();
        } catch (e) {
          // Retry ping once if failed immediately
          console.warn('[KeystoreClient] First ping failed, retrying...', e);
          try {
             await new Promise(r => setTimeout(r, 1000));
             await this.ping();
             resolve();
          } catch (retryErr) {
             reject(retryErr);
          }
        }
      };
      
      this.iframe.onerror = (e) => {
        clearTimeout(loadTimeout);
        console.error('[KeystoreClient] Iframe load error', e);
        reject(new Error('Failed to load bridge iframe'));
      };

      document.body.appendChild(this.iframe);
    });
  }

  public disconnect() {
    if (this.iframe) {
      document.body.removeChild(this.iframe);
      this.iframe = null;
    }
    window.removeEventListener('message', this.handleMessage);
    this.pendingRequests.clear();
  }

  private handleMessage = (event: MessageEvent) => {
    // In production, we should check event.origin matches bridgeUrl's origin
    // const bridgeOrigin = new URL(this.bridgeUrl).origin;
    // if (event.origin !== bridgeOrigin) return;

    const { data } = event;
    // console.log('[KeystoreClient] Received message:', data);

    if (!data || !data.requestId) return;

    const resolver = this.pendingRequests.get(data.requestId);
    if (resolver) {
      this.pendingRequests.delete(data.requestId);
      if (data.ok === false) {
        resolver.reject(new Error(data.error || 'Unknown bridge error'));
      } else {
        resolver.resolve(data);
      }
    }
  };

  private request<T>(message: BridgeRequest): Promise<T> {
    if (!this.iframe || !this.iframe.contentWindow) {
      return Promise.reject(new Error('Bridge not connected'));
    }

    const requestId = message.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { 
        resolve: (val: BridgeResponse) => resolve(val as T), 
        reject 
      });
      this.iframe!.contentWindow!.postMessage(message, '*'); // targetOrigin should be specific in prod
      
      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${message.type} timed out`));
        }
      }, 30000);
    });
  }

  public async ping(): Promise<number> {
    const start = performance.now();
    const res = await this.request<BridgeResponse>({
      type: 'PING',
      requestId: crypto.randomUUID(),
    });
    if (!res.ok) {
      throw new Error('Ping failed');
    }
    if (res.type !== 'PONG') {
      throw new Error('Invalid response type for PING');
    }
    return performance.now() - start;
  }

  public async getDIDKey(): Promise<string> {
    const res = await this.request<BridgeResponse>({
      type: 'getDIDKey',
      requestId: crypto.randomUUID(),
    });
    if (!res.ok) {
      throw new Error('Failed to get DID key');
    }
    if (typeof res.didKey !== 'string') {
      throw new Error('Invalid DID key format');
    }
    return res.didKey;
  }

  public async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const res = await this.request<BridgeResponse>({
      type: 'signMessage',
      requestId: crypto.randomUUID(),
      message,
    });
    if (!res.ok) {
      throw new Error('Failed to sign message');
    }
    if (!res.signature || !(res.signature instanceof Uint8Array)) {
      throw new Error('Invalid signature format');
    }
    return res.signature;
  }

  public async verifySignature(didKey: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const res = await this.request<BridgeResponse>({
      type: 'verifySignature',
      requestId: crypto.randomUUID(),
      didKey,
      message,
      signature,
    });
    if (!res.ok) {
      throw new Error('Failed to verify signature');
    }
    if (typeof res.verified !== 'boolean') {
      throw new Error('Invalid verification result format');
    }
    return res.verified;
  }
}
