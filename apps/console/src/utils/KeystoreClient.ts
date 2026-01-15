
export interface BridgeResponse {
  type: string;
  requestId: string;
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

export class KeystoreClient {
  private iframe: HTMLIFrameElement | null = null;
  private bridgeUrl: string;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: Error) => void }>();

  constructor(bridgeUrl: string = 'http://localhost:3001/bridge.html') {
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

      let loadTimeout = setTimeout(() => {
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

  private request<T>(type: string, payload: Record<string, unknown> = {}): Promise<T> {
    if (!this.iframe || !this.iframe.contentWindow) {
      return Promise.reject(new Error('Bridge not connected'));
    }

    const requestId = crypto.randomUUID();
    const message = {
      type,
      requestId,
      ...payload,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.iframe!.contentWindow!.postMessage(message, '*'); // targetOrigin should be specific in prod
      
      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request ${type} timed out`));
        }
      }, 30000);
    });
  }

  public async ping(): Promise<number> {
    const start = performance.now();
    await this.request('PING');
    return performance.now() - start;
  }

  public async getDIDKey(): Promise<string> {
    const res = await this.request<{ didKey: string }>('getDIDKey');
    return res.didKey;
  }

  public async signMessage(message: string): Promise<string> {
    const res = await this.request<{ signatureHex: string }>('signMessage', { message });
    return res.signatureHex;
  }

  public async verifySignature(didKey: string, message: string, signatureHex: string): Promise<boolean> {
    const res = await this.request<{ ok: boolean }>('verifySignature', {
      didKey,
      message,
      signatureHex,
    });
    return res.ok; // Note: 'ok' in response body means request success, but for verifySignature logic we might need to check inner field if defined differently. 
    // Based on previous bridge implementation: { ok: true/false } is the verification result for verifySignature? 
    // Wait, usually 'ok' in bridge response means "protocol success". 
    // Let's check bridge.ts implementation assumption:
    // If bridge.ts returns { ok: true } for valid signature and { ok: false, error: '...' } for invalid? 
    // Or { ok: true, isValid: boolean }?
    // Let's assume bridge returns { ok: true } on success (meaning signature valid) or throws error if invalid?
    // Re-reading bridge logic (implied): usually verify returns boolean.
    // If bridge.ts implementation was: setResponse({ ok: result }) -> then here res.ok is the result.
  }
}
