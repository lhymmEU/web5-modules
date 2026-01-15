
import { useState, useEffect } from 'react';
import { KeystoreClient } from '../utils/KeystoreClient';
import './KeyManager.css';

export function KeyManager() {
  const [client, setClient] = useState<KeystoreClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Test inputs
  const [signMsg, setSignMsg] = useState('Hello Web5');
  const [verifyDid, setVerifyDid] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('Hello Web5');
  const [verifySig, setVerifySig] = useState('');

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    const c = new KeystoreClient('http://localhost:3001/bridge.html');
    setClient(c);
    addLog('Client initialized, connecting...');

    let isMounted = true;

    c.connect()
      .then(() => {
        if (isMounted) {
          setConnected(true);
          addLog('Connected to Keystore Bridge');
        }
      })
      .catch((err) => {
        if (isMounted) {
          addLog(`Connection failed: ${err.message}`);
        }
      });

    return () => {
      isMounted = false;
      c.disconnect();
      setConnected(false);
    };
  }, []);

  const handlePing = async () => {
    if (!client) return;
    try {
      addLog('Sending PING...');
      const duration = await client.ping();
      addLog(`PONG received in ${duration.toFixed(2)}ms`);
    } catch (e: any) {
      addLog(`Ping failed: ${e.message}`);
    }
  };

  const handleGetDID = async () => {
    if (!client) return;
    try {
      addLog('Requesting DID Key...');
      const did = await client.getDIDKey();
      addLog(`DID Key: ${did || 'null (Not created in Keystore yet)'}`);
      if (did) setVerifyDid(did);
    } catch (e: any) {
      addLog(`GetDIDKey failed: ${e.message}`);
    }
  };

  const handleSign = async () => {
    if (!client) return;
    try {
      addLog(`Signing message: "${signMsg}"...`);
      const sig = await client.signMessage(signMsg);
      addLog(`Signature: ${sig}`);
      setVerifySig(sig);
    } catch (e: any) {
      addLog(`Sign failed: ${e.message}`);
    }
  };

  const handleVerify = async () => {
    if (!client) return;
    try {
      addLog(`Verifying... DID=${verifyDid.slice(0, 15)}...`);
      const isValid = await client.verifySignature(verifyDid, verifyMsg, verifySig);
      addLog(`Verification Result: ${isValid ? 'VALID' : 'INVALID'}`);
    } catch (e: any) {
      addLog(`Verification Result: INVALID or Error (${e.message})`);
    }
  };

  return (
    <div className="key-manager-container">
      <h2>Keystore Connection</h2>
      
      <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
        Status: {connected ? 'Connected' : 'Disconnected'}
      </div>

      <div className="km-card">
        <h3>Basic Actions</h3>
        <div className="km-actions">
          <button onClick={handlePing} disabled={!connected}>Ping</button>
          <button onClick={handleGetDID} disabled={!connected}>Get DID Key</button>
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
          <button onClick={handleSign} disabled={!connected}>Sign</button>
        </div>
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
          <button onClick={handleVerify} disabled={!connected}>Verify</button>
        </div>
      </div>

      <div className="km-logs">
        <h3>Logs</h3>
        <div className="km-log-window">
          {logs.map((log, i) => <div key={i} className="km-log-entry">{log}</div>)}
        </div>
      </div>
    </div>
  );
}
