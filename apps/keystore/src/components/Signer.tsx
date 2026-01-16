import { useState } from 'react';
import { Copy } from 'lucide-react';
import { bytesToHex, hexToBytes, signMessage, verifySignature } from '../utils/crypto';
import { getActiveKey } from '../utils/storage';

export function Signer() {
  const [message, setMessage] = useState('');
  const [signatureHex, setSignatureHex] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<null | 'ok' | 'error'>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifyDidKey, setVerifyDidKey] = useState(() => getActiveKey()?.didKey ?? '');
  const [verifySignatureHex, setVerifySignatureHex] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<null | { ok: boolean; text: string }>(null);

  const activeKey = getActiveKey();
  const hasKey = Boolean(activeKey?.privateKey);

  const onSign = async () => {
    if (!hasKey) return;
    setBusy(true);
    setError(null);
    try {
      const currentKey = getActiveKey();
      if (!currentKey?.privateKey) {
        setError('Local private key not found. Please create or import a key first.');
        return;
      }
      const bytes = new TextEncoder().encode(message);
      const signature = await signMessage(bytes, currentKey.privateKey);
      setSignatureHex(bytesToHex(signature));
    } catch {
      setError('Signing failed. Please check the input content or the key is valid.');
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setVerifyBusy(true);
    setVerifyResult(null);
    try {
      const msgBytes = new TextEncoder().encode(verifyMessage);
      const sigBytes = hexToBytes(verifySignatureHex.trim());
      const didKey = verifyDidKey.trim();
      const ok = await verifySignature(msgBytes, sigBytes, didKey);
      setVerifyResult(ok ? { ok: true, text: 'Signature verified successfully.' } : { ok: false, text: 'Signature verification failed.' });
    } catch {
      setVerifyResult({ ok: false, text: 'Verification failed: Invalid input format or content.' });
    } finally {
      setVerifyBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div style={{ fontWeight: 600 }}>Signer</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Use local private key to sign messages.</div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">Message</div>
        <textarea
          className="input"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={hasKey ? 'Enter the message to sign' : 'Please create or import a key first'}
          disabled={!hasKey || busy}
        />
      </div>

      <div className="flex gap-2" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-primary" onClick={onSign} disabled={!hasKey || busy || !message}>
          Sign
        </button>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">Signature (hex)</div>
        <div className="flex gap-2 items-center">
          <div className="code-block" style={{ flex: 1 }}>
            {signatureHex ? signatureHex : 'Did not sign yet.'}
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Copy signature"
            disabled={!signatureHex}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(signatureHex);
                setCopyStatus('ok');
                window.setTimeout(() => setCopyStatus(null), 1200);
              } catch {
                setCopyStatus('error');
                window.setTimeout(() => setCopyStatus(null), 1200);
              }
            }}
          >
            <Copy size={18} color={copyStatus === 'ok' ? 'var(--success-color)' : 'var(--text-secondary)'} />
          </button>
        </div>
        {error ? <div style={{ marginTop: '0.5rem', color: 'var(--danger-color)' }}>{error}</div> : null}
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div className="label">Verify Signature</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Verify signature using active did:key.</div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">did:key</div>
        <input
          className="input"
          value={verifyDidKey}
          onChange={(e) => setVerifyDidKey(e.target.value)}
          placeholder="Paste did:key"
          disabled={verifyBusy}
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">Message</div>
        <textarea
          className="input"
          rows={4}
          value={verifyMessage}
          onChange={(e) => setVerifyMessage(e.target.value)}
          placeholder="Enter the message to verify"
          disabled={verifyBusy}
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">Signature (hex)</div>
        <textarea
          className="input"
          rows={3}
          value={verifySignatureHex}
          onChange={(e) => setVerifySignatureHex(e.target.value)}
          placeholder="Enter the signature to verify (hex)"
          disabled={verifyBusy}
        />
      </div>

      <div className="flex gap-2" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onVerify}
          disabled={verifyBusy || !verifyMessage || !verifyDidKey.trim() || !verifySignatureHex.trim()}
        >
          Verify
        </button>
      </div>

      {verifyResult ? (
        <div style={{ marginTop: '0.75rem', color: verifyResult.ok ? 'var(--success-color)' : 'var(--danger-color)' }}>
          {verifyResult.text}
        </div>
      ) : null}
    </div>
  );
}
