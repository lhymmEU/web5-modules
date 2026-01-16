import { useState } from 'react';
import { useKeystore } from '../contexts/KeystoreContext';
import { Check, AlertCircle } from 'lucide-react';
import './KeyManager.css';

export function KeyManager() {
  const { client, connected } = useKeystore();
  
  // States for operation results
  const [pingStatus, setPingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pingResult, setPingResult] = useState('');

  const [didStatus, setDidStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [didResult, setDidResult] = useState('');

  const [signStatus, setSignStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signMsg, setSignMsg] = useState('Hello Web5');
  const [signResult, setSignResult] = useState('');

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyDid, setVerifyDid] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('Hello Web5');
  const [verifySig, setVerifySig] = useState('');
  const [verifyResult, setVerifyResult] = useState('');

  const handlePing = async () => {
    if (!client) return;
    setPingStatus('loading');
    try {
      const duration = await client.ping();
      setPingResult(`PONG in ${duration.toFixed(2)}ms`);
      setPingStatus('success');
    } catch (e: any) {
      setPingResult(e.message);
      setPingStatus('error');
    }
  };

  const handleGetDID = async () => {
    if (!client) return;
    setDidStatus('loading');
    try {
      const did = await client.getDIDKey();
      if (did) {
        setDidResult(did);
        setVerifyDid(did);
        setDidStatus('success');
      } else {
        setDidResult('No DID returned (Key not created?)');
        setDidStatus('error');
      }
    } catch (e: any) {
      setDidResult(e.message);
      setDidStatus('error');
    }
  };

  const handleSign = async () => {
    if (!client) return;
    setSignStatus('loading');
    try {
      const sig = await client.signMessage(signMsg);
      setSignResult(sig);
      setVerifySig(sig);
      setSignStatus('success');
    } catch (e: any) {
      setSignResult(e.message);
      setSignStatus('error');
    }
  };

  const handleVerify = async () => {
    if (!client) return;
    setVerifyStatus('loading');
    try {
      const isValid = await client.verifySignature(verifyDid, verifyMsg, verifySig);
      setVerifyResult(isValid ? 'Signature Valid' : 'Signature Invalid');
      setVerifyStatus(isValid ? 'success' : 'error');
    } catch (e: any) {
      setVerifyResult(e.message);
      setVerifyStatus('error');
    }
  };

  const renderStatus = (status: string, result: string) => {
    if (status === 'idle') return null;
    if (status === 'loading') return <div className="result-loading">Processing...</div>;
    return (
      <div className={`result-box ${status}`}>
        {status === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
        <span className="result-text">{result}</span>
      </div>
    );
  };

  return (
    <div className="key-manager-container">
      <div className="km-card">
        <h3>Basic Actions</h3>
        <div className="km-actions-row">
          <div className="action-item">
            <button onClick={handlePing} disabled={!connected || pingStatus === 'loading'}>
              Ping Bridge
            </button>
            {renderStatus(pingStatus, pingResult)}
          </div>
          
          <div className="action-item">
            <button onClick={handleGetDID} disabled={!connected || didStatus === 'loading'}>
              Get DID Key
            </button>
            {renderStatus(didStatus, didResult)}
          </div>
        </div>
      </div>

      <div className="km-card">
        <h3>Sign Message</h3>
        <div className="km-input-group">
          <input 
            value={signMsg} 
            onChange={(e) => setSignMsg(e.target.value)} 
            placeholder="Message to sign"
          />
          <button onClick={handleSign} disabled={!connected || signStatus === 'loading'}>
            {signStatus === 'loading' ? 'Signing...' : 'Sign'}
          </button>
        </div>
        {renderStatus(signStatus, signResult)}
      </div>

      <div className="km-card">
        <h3>Verify Signature</h3>
        <div className="km-input-group km-vertical">
          <input 
            value={verifyDid} 
            onChange={(e) => setVerifyDid(e.target.value)} 
            placeholder="DID Key"
          />
          <input 
            value={verifyMsg} 
            onChange={(e) => setVerifyMsg(e.target.value)} 
            placeholder="Message"
          />
          <input 
            value={verifySig} 
            onChange={(e) => setVerifySig(e.target.value)} 
            placeholder="Signature Hex"
          />
          <button onClick={handleVerify} disabled={!connected || verifyStatus === 'loading'}>
            {verifyStatus === 'loading' ? 'Verifying...' : 'Verify'}
          </button>
        </div>
        {renderStatus(verifyStatus, verifyResult)}
      </div>

      <style>{`
        .km-actions-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .action-item {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .result-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          word-break: break-all;
        }
        .result-box.success {
          background-color: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .result-box.error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .result-loading {
          color: #64748b;
          font-style: italic;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
