
import { useState, useEffect } from 'react';
import { Fingerprint, Wallet, Loader, FileJson, Send, Hammer, RefreshCw, Trash2, ArrowRight, Edit, Search, CheckCircle, XCircle } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';
import { useKeystore } from '../contexts/KeystoreContext';
import { 
  buildCreateTransaction, 
  sendCkbTransaction, 
  fetchDidCkbCellsInfo, 
  type didCkbCellInfo,
  transferDidCell,
  destroyDidCell,
  updateDidKey,
  updateAka
} from '../utils/didCKB';
import { checkUsernameAvailability, checkUsernameFormat, pdsPreCreateAccount, buildPreCreateSignData, pdsCreateAccount, type userInfo, pdsPreDeleteAccount, pdsDeleteAccount } from '../utils/pds';

function DidItem({ item, onTransfer, onUpdateKey, onUpdateAka, onDestroy, processing }: {
  item: didCkbCellInfo;
  onTransfer: (args: string, receiver: string) => void;
  onUpdateKey: (args: string, key: string) => void;
  onUpdateAka: (args: string, aka: string) => void;
  onDestroy: (args: string) => void;
  processing: boolean;
}) {
  const [mode, setMode] = useState<'view' | 'transfer' | 'update'>('view');
  const [transferAddr, setTransferAddr] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newAka, setNewAka] = useState('');

  // Extract current values for defaults
  useEffect(() => {
    try {
      const doc = JSON.parse(item.didMetadata);
      if (doc.verificationMethods?.atproto) {
        // Defer setState to avoid cascading renders
        queueMicrotask(() => setNewKey(doc.verificationMethods.atproto));
      }
      if (doc.alsoKnownAs) queueMicrotask(() => setNewAka(JSON.stringify(doc.alsoKnownAs)));
    } catch {
      // ignore
    }
  }, [item.didMetadata]);

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>{item.did}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
            Capacity: {item.capacity} CKB
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            OutPoint: {item.txHash}:{item.index}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
           {mode === 'view' && (
             <>
               <button className="btn-sm btn-secondary" onClick={() => setMode('update')} disabled={processing} title="Update">
                 <Edit size={14} />
               </button>
               <button className="btn-sm btn-secondary" onClick={() => setMode('transfer')} disabled={processing} title="Transfer">
                 <ArrowRight size={14} />
               </button>
               <button className="btn-sm btn-danger" onClick={() => onDestroy(item.args)} disabled={processing} title="Destroy">
                 <Trash2 size={14} />
               </button>
             </>
           )}
           {mode !== 'view' && (
             <button className="btn-sm btn-secondary" onClick={() => setMode('view')} disabled={processing}>Cancel</button>
           )}
        </div>
      </div>

      {mode === 'transfer' && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500, color: '#1e293b' }}>Transfer to Address</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              className="input" 
              style={{ flex: 1 }} 
              placeholder="ckb1..." 
              value={transferAddr}
              onChange={(e) => setTransferAddr(e.target.value)}
            />
            <button 
              className="btn btn-primary"
              disabled={!transferAddr || processing}
              onClick={() => onTransfer(item.args, transferAddr)}
            >
              Transfer
            </button>
          </div>
        </div>
      )}

      {mode === 'update' && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500, color: '#1e293b' }}>Update Atproto Key</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                className="input" 
                style={{ flex: 1 }} 
                placeholder="did:key:..." 
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
              <button 
                className="btn btn-primary"
                disabled={!newKey || processing}
                onClick={() => onUpdateKey(item.args, newKey)}
              >
                Update
              </button>
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.25rem', fontWeight: 500, color: '#1e293b' }}>Update Also Known As (JSON)</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                className="input" 
                style={{ flex: 1 }} 
                placeholder='["at://..."]' 
                value={newAka}
                onChange={(e) => setNewAka(e.target.value)}
              />
              <button 
                className="btn btn-primary"
                disabled={!newAka || processing}
                onClick={() => onUpdateAka(item.args, newAka)}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '0.5rem' }}>
         <details>
           <summary style={{ fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>Show Metadata</summary>
           <pre style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
             {JSON.stringify(JSON.parse(item.didMetadata), null, 2)}
           </pre>
         </details>
      </div>
    </div>
  );
}

export function DidManager() {
  const { wallet, open, disconnect } = ccc.useCcc();
  const signer = ccc.useSigner();
  const { didKey, client } = useKeystore();
  
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [loadingInfo, setLoadingInfo] = useState(false);

  // DID List State
  const [didList, setDidList] = useState<didCkbCellInfo[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Action States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // PDS Pre-registration States
  const [pdsAddress, setPdsAddress] = useState('');
  const [pdsUsername, setPdsUsername] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [checkMessage, setCheckMessage] = useState('');

  const handleCheckUsername = async () => {
    if (!pdsAddress || !pdsUsername) {
      setCheckStatus('error');
      setCheckMessage('Please enter both PDS Address and Username');
      return;
    }

    if (!checkUsernameFormat(pdsUsername)) {
      setCheckStatus('error');
      setCheckMessage('Invalid username format. Must be 4-18 characters, start with a letter, contain only lowercase letters, numbers, and hyphens (-), and end with a letter or number.');
      return;
    }

    setCheckStatus('checking');
    setCheckMessage('');

    try {
      const available = await checkUsernameAvailability(pdsUsername, pdsAddress);
      
      if (available === false) {
        setCheckStatus('taken');
        setCheckMessage('Username is already taken');
      } else if (available === true) {
        setCheckStatus('available');
        setCheckMessage('Username is available');
      } else {
        setCheckStatus('error');
        setCheckMessage('Unknown response from PDS');
      }
    } catch (e: unknown) {
      setCheckStatus('error');
      setCheckMessage(e instanceof Error ? e.message : String(e));
    }
  };

  // DID Creation States
  const [metadata, setMetadata] = useState(JSON.stringify({
    services: { 
      atproto_pds: { 
        type: "AtprotoPersonalDataServer", 
        endpoint: "https://pds.example.com" 
      } 
    }, 
    alsoKnownAs: ["at://alice.example.com"], 
    verificationMethods: { 
      atproto: "did:key:zQ3shvzLcx2TeGmV33sPsVieaXWdjYwAcGXfiVgSyfhe6JdHh" 
    }
  }, null, 2));

  // Auto-update metadata when PDS info changes
  useEffect(() => {
    try {
      const current = JSON.parse(metadata);
      let changed = false;

      // Determine new values
      const handle = pdsUsername && pdsAddress ? `${pdsUsername}.${pdsAddress}` : 'alice.example.com';
      let endpoint = pdsAddress ? pdsAddress : 'https://pds.example.com';
      if (endpoint !== 'https://pds.example.com' && !endpoint.startsWith('http')) {
        endpoint = `https://${endpoint}`;
      }

      // Update Endpoint
      if (!current.services) current.services = {};
      if (!current.services.atproto_pds) current.services.atproto_pds = { type: "AtprotoPersonalDataServer" };
      
      if (current.services.atproto_pds.endpoint !== endpoint) {
        current.services.atproto_pds.endpoint = endpoint;
        changed = true;
      }

      // Update Handle (alsoKnownAs)
      const newAka = `at://${handle}`;
      if (!current.alsoKnownAs || !Array.isArray(current.alsoKnownAs)) {
        current.alsoKnownAs = [newAka];
        changed = true;
      } else if (current.alsoKnownAs[0] !== newAka) {
        current.alsoKnownAs[0] = newAka;
        changed = true;
      }

      // Update Verification Method (didKey)
      const newDidKey = didKey || "did:key:zQ3shvzLcx2TeGmV33sPsVieaXWdjYwAcGXfiVgSyfhe6JdHh";
      if (!current.verificationMethods) current.verificationMethods = {};
      if (current.verificationMethods.atproto !== newDidKey) {
        current.verificationMethods.atproto = newDidKey;
        changed = true;
      }

      if (changed) {
        setMetadata(JSON.stringify(current, null, 2));
      }
    } catch {
      // Ignore parse errors while user is editing manually
    }
  }, [pdsAddress, pdsUsername, didKey, metadata]);
  
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [rawTx, setRawTx] = useState<string>('');
  const [generatedDid, setGeneratedDid] = useState<string>('');
  const [buildError, setBuildError] = useState<string>('');

  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');

  // PDS Delete States
  const [deletePdsDid, setDeletePdsDid] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');

  const handleDeletePdsAccount = async () => {
    if (!deletePdsDid || !address || !didKey || !pdsAddress) {
      setDeleteError('Missing required info (DID to delete, CKB Address, DID Key, or PDS Address)');
      setDeleteStatus('error');
      return;
    }

    if (!confirm('Are you sure you want to delete this PDS account? This action cannot be undone.')) return;

    setDeleteStatus('processing');
    setDeleteError('');

    try {
      // 1. Pre-delete (get message to sign)
      const messageToSign = await pdsPreDeleteAccount(deletePdsDid, address, pdsAddress);
      if (!messageToSign) {
        throw new Error('Failed to prepare delete account');
      }

      // 2. Sign with Keystore
      if (!client) {
        throw new Error('Keystore client not connected');
      }

      const sig = await client.signMessage(messageToSign);
      
      if (!sig) {
        throw new Error('Failed to sign message');
      }

      // 3. Delete account
      const success = await pdsDeleteAccount(deletePdsDid, address, didKey, pdsAddress, messageToSign, sig);
      
      if (success) {
        setDeleteStatus('success');
        setDeletePdsDid(''); // Clear input on success
      } else {
        throw new Error('Failed to delete PDS account');
      }
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e));
      setDeleteStatus('error');
    }
  };

  // PDS Registration States
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [registerError, setRegisterError] = useState('');
  const [registeredUserInfo, setRegisteredUserInfo] = useState<userInfo | null>(null);

  const handleRegisterPds = async () => {
    if (!generatedDid || !didKey || !pdsUsername || !pdsAddress || !address) {
      setRegisterError('Missing required information (DID, DID Key, Username, PDS Address, or CKB Address)');
      setRegisterStatus('error');
      return;
    }

    setRegisterStatus('processing');
    setRegisterError('');
    setRegisteredUserInfo(null);

    try {
      // 1. Pre-create account
      const preCreateResult = await pdsPreCreateAccount(pdsUsername, pdsAddress, didKey, generatedDid);
      if (!preCreateResult) {
        throw new Error('Failed to pre-create PDS account');
      }

      // 2. Build sign data
      const signData = buildPreCreateSignData(preCreateResult);
      if (!signData) {
        throw new Error('Failed to build sign data');
      }

      // 3. Sign with Keystore
      if (!client) {
        throw new Error('Keystore client not connected');
      }
      
      const sig = await client.signMessage(signData);
      
      if (!sig) {
        throw new Error('Failed to sign message');
      }

      // 4. Create account
      const userInfo = await pdsCreateAccount(preCreateResult, sig, pdsUsername, pdsAddress, didKey, address);
      
      if (userInfo) {
        setRegisteredUserInfo(userInfo);
        setRegisterStatus('success');
      } else {
        throw new Error('Failed to create PDS account');
      }
    } catch (e: unknown) {
      setRegisterError(e instanceof Error ? e.message : String(e));
      setRegisterStatus('error');
    }
  };



  useEffect(() => {
    if (!signer) {
      setAddress('');
      setBalance('');
      return;
    }

    const fetchInfo = async () => {
      setLoadingInfo(true);
      try {
        const addr = await signer.getRecommendedAddress();
        setAddress(addr);
        
        // getBalance returns Shannons (BigInt)
        const bal = await signer.getBalance();
        // Convert Shannons to CKB (1 CKB = 10^8 Shannons)
        const ckb = (Number(bal) / 100_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
        setBalance(ckb);
      } catch (e) {
        console.error('Failed to fetch signer info:', e);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInfo();
  }, [signer]);

  const handleFetchList = async () => {
    if (!signer) return;
    setLoadingList(true);
    setActionStatus(null);
    setDidList([]);
    try {
      const list = await fetchDidCkbCellsInfo(signer);
      setDidList(list);
    } catch (e) {
      console.error('Failed to fetch DID list:', e);
    } finally {
      setLoadingList(false);
    }
  };

  const handleTransfer = async (didArgs: string, receiver: string) => {
    if (!signer) return;
    setProcessingId(didArgs);
    setActionStatus(null);
    try {
      const hash = await transferDidCell(signer, didArgs, receiver);
      if (hash) {
        setActionStatus({ type: 'success', message: `Transfer successful! Tx: ${hash}` });
        handleFetchList();
      } else {
        setActionStatus({ type: 'error', message: 'Transfer failed' });
      }
    } catch (e: unknown) {
      setActionStatus({ type: 'error', message: e instanceof Error ? e.message : String(e) || 'Transfer failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDestroy = async (didArgs: string) => {
    if (!signer) return;
    if (!confirm('Are you sure you want to destroy this DID? This action cannot be undone.')) return;
    
    setProcessingId(didArgs);
    setActionStatus(null);
    try {
      const hash = await destroyDidCell(signer, didArgs);
      if (hash) {
        setActionStatus({ type: 'success', message: `Destroy successful! Tx: ${hash}` });
        handleFetchList();
      } else {
        setActionStatus({ type: 'error', message: 'Destroy failed' });
      }
    } catch (e: unknown) {
      setActionStatus({ type: 'error', message: e instanceof Error ? e.message : String(e) || 'Destroy failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateKey = async (didArgs: string, newKey: string) => {
    if (!signer) return;
    setProcessingId(didArgs);
    setActionStatus(null);
    try {
      const hash = await updateDidKey(signer, didArgs, newKey);
      if (hash) {
        setActionStatus({ type: 'success', message: `Update Key successful! Tx: ${hash}` });
        handleFetchList();
      } else {
        setActionStatus({ type: 'error', message: 'Update Key failed' });
      }
    } catch (e: unknown) {
      setActionStatus({ type: 'error', message: e instanceof Error ? e.message : String(e) || 'Update Key failed' });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleUpdateAka = async (didArgs: string, newAka: string) => {
    if (!signer) return;
    setProcessingId(didArgs);
    setActionStatus(null);
    try {
      const hash = await updateAka(signer, didArgs, newAka);
      if (hash) {
        setActionStatus({ type: 'success', message: `Update AKA successful! Tx: ${hash}` });
        handleFetchList();
      } else {
        setActionStatus({ type: 'error', message: 'Update AKA failed' });
      }
    } catch (e: unknown) {
      setActionStatus({ type: 'error', message: e instanceof Error ? e.message : String(e) || 'Update AKA failed' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuildTx = async () => {
    if (!signer) return;
    setBuildStatus('building');
    setBuildError('');
    setRawTx('');
    setGeneratedDid('');
    
    try {
      const { rawTx, did } = await buildCreateTransaction(signer, metadata);
      setRawTx(rawTx);
      setGeneratedDid(did);
      setBuildStatus('success');
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : String(e) || 'Failed to build transaction');
      setBuildStatus('error');
    }
  };

  const handleSendTx = async () => {
    if (!signer || !rawTx) return;
    setSendStatus('sending');
    setSendError('');
    setTxHash('');

    try {
      // FIX: ccc.Transaction doesn't seem to have a static from() easily accessible here without import.
      // Let's assume JSON.parse is enough for now, or the ccc library handles plain objects as tx.
      const txObj = JSON.parse(rawTx);
      
      const hash = await sendCkbTransaction(signer, txObj);
      setTxHash(hash);
      setSendStatus('success');
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : String(e) || 'Failed to send transaction');
      setSendStatus('error');
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 20) return addr;
    return `${addr.slice(0, 10)}...${addr.slice(-10)}`;
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          background: '#e0e7ff', 
          padding: '0.5rem', 
          borderRadius: '8px',
          color: '#4338ca'
        }}>
          <Fingerprint size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>DID Manager</h2>
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Manage your Decentralized Identifiers</div>
        </div>
      </div>

      {/* Pre-register PDS Account Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <Search size={18} />
          Register PDS Account (Check Username)
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>PDS Address</label>
            <input 
              className="input" 
              placeholder="e.g. pds.example.com" 
              value={pdsAddress}
              onChange={(e) => setPdsAddress(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#475569', marginBottom: '0.25rem' }}>Username</label>
            <input 
              className="input" 
              placeholder="e.g. alice" 
              value={pdsUsername}
              onChange={(e) => setPdsUsername(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleCheckUsername}
          disabled={checkStatus === 'checking' || !pdsAddress || !pdsUsername}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {checkStatus === 'checking' ? <Loader size={16} className="spin" /> : <Search size={16} />}
          Check Username
        </button>

        {checkStatus !== 'idle' && checkStatus !== 'checking' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '6px', 
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: checkStatus === 'available' ? '#f0fdf4' : '#fef2f2',
            color: checkStatus === 'available' ? '#15803d' : '#991b1b',
            border: `1px solid ${checkStatus === 'available' ? '#bbf7d0' : '#fecaca'}`
          }}>
            {checkStatus === 'available' ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {checkMessage}
          </div>
        )}
      </div>

      {/* CKB Wallet Connection Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
          <Wallet size={18} />
          CKB Wallet
        </h3>
        
        {!wallet ? (
          <button 
            className="btn btn-primary"
            onClick={open}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Wallet size={16} /> Connect Wallet
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.875rem' }}>
              <div style={{ color: '#64748b', fontWeight: 500 }}>Address:</div>
              <div 
                style={{ fontFamily: 'monospace', color: '#334155', cursor: 'pointer' }} 
                title={address}
                onClick={() => {
                  navigator.clipboard.writeText(address);
                }}
              >
                {loadingInfo ? <Loader size={14} className="spin" /> : formatAddress(address)}
              </div>
              
              <div style={{ color: '#64748b', fontWeight: 500 }}>Balance:</div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {loadingInfo ? <Loader size={14} className="spin" /> : `${balance} CKB`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                    className="btn btn-secondary"
                    onClick={open}
                >
                    Wallet Settings
                </button>
                <button 
                    className="btn btn-danger"
                    onClick={disconnect}
                >
                    Disconnect
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Create DID Section */}
      {wallet && (
        <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
            <FileJson size={18} />
            Create DID
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>DID Metadata (JSON)</div>
            <textarea
              className="input"
              rows={10}
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <button 
              className="btn btn-primary"
              onClick={handleBuildTx}
              disabled={buildStatus === 'building'}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {buildStatus === 'building' ? <Loader size={16} className="spin" /> : <Hammer size={16} />}
              Construct Transaction
            </button>
          </div>

          {buildStatus === 'error' && (
            <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Error: {buildError}
            </div>
          )}

          {buildStatus === 'success' && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: '#0369a1' }}>Transaction Constructed Successfully</div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Generated DID</div>
                <div style={{ fontFamily: 'monospace', background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', color: '#334155' }}>
                  {generatedDid}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Raw Transaction</div>
                <div style={{ 
                  fontFamily: 'monospace', 
                  background: '#fff', 
                  padding: '0.5rem', 
                  borderRadius: '4px', 
                  border: '1px solid #cbd5e1', 
                  color: '#334155',
                  fontSize: '0.75rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap'
                }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(rawTx), null, 2);
                    } catch (e: unknown) {
                      return e instanceof Error ? e.message : String(e) || rawTx;
                    }
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: '1rem', borderBottom: '1px solid #cbd5e1', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>Step 1:</span> Register your PDS account first. This ensures your handle is reserved.
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={handleRegisterPds}
                  disabled={registerStatus === 'processing' || !generatedDid || !didKey}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}
                >
                  {registerStatus === 'processing' ? <Loader size={16} className="spin" /> : <Search size={16} />}
                  Register PDS Account
                </button>

                {registerStatus === 'error' && (
                  <div style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.875rem' }}>
                    Registration failed: {registerError}
                  </div>
                )}

                {registerStatus === 'success' && registeredUserInfo && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ color: '#16a34a', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={16} /> Registration Successful!
                    </div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#334155' }}>
                      <div style={{ marginBottom: '0.25rem' }}><strong>Handle:</strong> {registeredUserInfo.handle}</div>
                      <div style={{ marginBottom: '0.25rem' }}><strong>DID:</strong> {registeredUserInfo.did}</div>
                      <details>
                        <summary style={{ cursor: 'pointer', color: '#64748b' }}>Show Tokens</summary>
                        <div style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>
                          <div style={{ marginBottom: '0.25rem' }}><strong>Access JWT:</strong> {registeredUserInfo.accessJwt}</div>
                          <div><strong>Refresh JWT:</strong> {registeredUserInfo.refreshJwt}</div>
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#dc2626' }}>Step 2:</span> Send the transaction to CKB to register your DID.
                </div>
                <button 
                  className="btn btn-success"
                  onClick={handleSendTx}
                  disabled={sendStatus === 'sending'}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {sendStatus === 'sending' ? <Loader size={16} className="spin" /> : <Send size={16} />}
                  Send Transaction
                </button>

                {sendStatus === 'error' && (
                  <div style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.875rem' }}>
                    Send failed: {sendError}
                  </div>
                )}

                {sendStatus === 'success' && (
                  <div style={{ marginTop: '0.75rem', color: '#16a34a', fontSize: '0.875rem', fontWeight: 600 }}>
                    Transaction Sent! Hash: {txHash}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete DID Section */}
      {wallet && (
        <div style={{ padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
            <Trash2 size={18} />
            Delete PDS Account
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500, color: '#475569' }}>DID to Delete</div>
            <input 
              className="input" 
              placeholder="did:ckb:..." 
              value={deletePdsDid}
              onChange={(e) => setDeletePdsDid(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button 
            className="btn btn-danger"
            onClick={handleDeletePdsAccount}
            disabled={deleteStatus === 'processing' || !deletePdsDid || !didKey}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {deleteStatus === 'processing' ? <Loader size={16} className="spin" /> : <Trash2 size={16} />}
            Delete PDS Account
          </button>

          {deleteStatus === 'error' && (
            <div style={{ marginTop: '0.75rem', color: '#dc2626', fontSize: '0.875rem' }}>
              Deletion failed: {deleteError}
            </div>
          )}

          {deleteStatus === 'success' && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <CheckCircle size={16} /> PDS Account Deleted Successfully!
              </div>
              <div>Please proceed to "My DIDs" section below to destroy the corresponding DID Cell on CKB.</div>
            </div>
          )}
        </div>
      )}

      {/* My DIDs Section */}
      {wallet && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
              <Fingerprint size={18} />
              My DIDs
            </h3>
            <button 
              className="btn btn-secondary" 
              onClick={handleFetchList}
              disabled={loadingList}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
            >
              <RefreshCw size={14} className={loadingList ? 'spin' : ''} />
              Refresh List
            </button>
          </div>

          {actionStatus && (
            <div style={{ 
              marginBottom: '1rem', 
              padding: '0.75rem', 
              borderRadius: '6px', 
              fontSize: '0.875rem',
              background: actionStatus.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: actionStatus.type === 'success' ? '#15803d' : '#991b1b',
              border: `1px solid ${actionStatus.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {actionStatus.message}
            </div>
          )}

          {didList.length === 0 && !loadingList ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              No DIDs found. Click "Refresh List" to fetch or Create one above!
            </div>
          ) : (
            <div>
              {didList.map((item) => (
                <DidItem 
                  key={`${item.txHash}-${item.index}`} 
                  item={item} 
                  onTransfer={handleTransfer}
                  onUpdateKey={handleUpdateKey}
                  onUpdateAka={handleUpdateAka}
                  onDestroy={handleDestroy}
                  processing={processingId === item.args}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); }
        }
        .btn-sm {
          padding: 0.35rem 0.5rem;
          font-size: 0.75rem;
          line-height: 1;
          height: auto;
        }
      `}</style>
    </div>
  );
}
