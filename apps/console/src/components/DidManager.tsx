
import { useState, useEffect } from 'react';
import { Fingerprint, Loader, FileJson, Send, Hammer, RefreshCw, Trash2, ArrowRight, Edit, CheckCircle } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';
import { useKeystore } from '../contexts/KeystoreContext';
import { 
  buildCreateTransaction, 
  sendCkbTransaction, 
  fetchDidCkbCellsInfo, 
  type didCkbCellInfo,
  transferDidCell,
  updateHandle,
  destroyDidCell,
  updateDidKey
} from 'did_module/logic';
import { getDidByUsername } from 'pds_module/logic';

import { usePds } from '../contexts/PdsContext';

function DidItem({ item, onTransfer, onUpdateKey, onUpdateHandle, onDestroy, processing }: {
  item: didCkbCellInfo;
  onTransfer: (args: string, receiver: string) => void;
  onUpdateKey: (args: string, key: string) => void;
  onUpdateHandle: (args: string, handle: string) => void;
  onDestroy: (args: string) => void;
  processing: boolean;
}) {
  const [mode, setMode] = useState<'view' | 'transfer' | 'update'>('view');
  const [transferAddr, setTransferAddr] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newHandle, setNewHandle] = useState('');

  // Extract current values for defaults
  useEffect(() => {
    try {
      const doc = JSON.parse(item.didMetadata);
      if (doc.verificationMethods?.atproto) {
        // Defer setState to avoid cascading renders
        queueMicrotask(() => setNewKey(doc.verificationMethods.atproto));
      }
      // handle is the first item in alsoKnownAs and remove the prefix "at://"
      if (doc.alsoKnownAs) queueMicrotask(() => setNewHandle(doc.alsoKnownAs[0].replace('at://', '')));
    } catch {
      // ignore
    }
  }, [item.didMetadata]);

  return (
    <div className="card mb-md overflow-hidden">
      <div className="flex-col items-start mb-sm gap-sm">
        <div className="w-full">
          <div className="font-bold text-inherit mb-xs break-all">{item.did}</div>
          <div className="text-xs text-muted font-mono">
            Capacity: {item.capacity} CKB
          </div>
          <div className="text-xs text-muted font-mono break-all">
            OutPoint: {item.txHash}:{item.index}
          </div>
        </div>
        <div className="flex gap-sm w-full justify-end">
           {mode === 'view' && (
             <>
               <button className="btn btn-sm btn-secondary" onClick={() => setMode('update')} disabled={processing} title="Update">
                 <Edit size={14} />
               </button>
               <button className="btn btn-sm btn-secondary" onClick={() => setMode('transfer')} disabled={processing} title="Transfer">
                 <ArrowRight size={14} />
               </button>
               <button className="btn btn-sm btn-danger" onClick={() => onDestroy(item.args)} disabled={processing} title="Destroy">
                 <Trash2 size={14} />
               </button>
             </>
           )}
           {mode !== 'view' && (
             <button className="btn btn-sm btn-secondary" onClick={() => setMode('view')} disabled={processing}>Cancel</button>
           )}
        </div>
      </div>

      {mode === 'transfer' && (
        <div className="mb-md p-md bg-slate-50 rounded-md">
          <div className="text-sm mb-sm font-medium">Transfer to Address</div>
          <div className="flex gap-sm">
            <input 
              className="input flex-1" 
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
        <div className="mb-md bg-slate-50 p-md rounded-md">
          <div className="mb-md">
            <div className="text-sm mb-sm font-medium">Update Atproto Key</div>
            <div className="flex gap-sm">
              <input 
                className="input flex-1" 
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
            <div className="text-sm mb-sm font-medium">Update Handle</div>
            <div className="flex gap-sm">
              <input 
                className="input flex-1" 
                placeholder='alice.example.com' 
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
              />
              <button 
                className="btn btn-primary"
                disabled={!newHandle || processing}
                onClick={() => onUpdateHandle(item.args, newHandle)}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-sm">
         <details>
           <summary className="text-xs text-muted cursor-pointer">Show Metadata</summary>
           <pre>
             {JSON.stringify(JSON.parse(item.didMetadata), null, 2)}
           </pre>
         </details>
      </div>
    </div>
  );
}

export function DidManager() {
  const { wallet } = ccc.useCcc();
  const signer = ccc.useSigner();
  const { didKey } = useKeystore();
  const { pdsUrl: pdsAddress, username: pdsUsername, resolvedDid: resolvedPdsDid, isResolving: isCheckingUsername, isAvailable } = usePds();
  
  // DID List State
  const [didList, setDidList] = useState<didCkbCellInfo[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  // Action States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
      // username in metadata is lowercase
      const userName = pdsUsername.toLowerCase();
      const handle = pdsUsername && pdsAddress ? `${userName}.${pdsAddress}` : 'alice.example.com';
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

      // Update Verification Method
      if (didKey) {
        if (!current.verificationMethods) current.verificationMethods = {};
        if (current.verificationMethods.atproto !== didKey) {
          current.verificationMethods.atproto = didKey;
          changed = true;
        }
      }

      if (changed) {
        setMetadata(JSON.stringify(current, null, 2));
      }
    } catch {
      // Ignore errors in metadata parsing during auto-update
    }
  }, [metadata, pdsUsername, pdsAddress, didKey]);
  
  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle');
  const [rawTx, setRawTx] = useState<string>('');
  const [generatedDid, setGeneratedDid] = useState<string>('');
  const [buildError, setBuildError] = useState<string>('');

  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [sendError, setSendError] = useState<string>('');

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
    
    // Find metadata for this DID
    const didItem = didList.find(item => item.args === didArgs);
    if (didItem) {
      try {
        const metadata = JSON.parse(didItem.didMetadata);
        if (metadata.alsoKnownAs && metadata.alsoKnownAs.length > 0) {
          const aka = metadata.alsoKnownAs[0];
          if (aka.startsWith('at://')) {
            const handle = aka.replace('at://', '');
            // Simple parsing to extract username and pds
            const parts = handle.split('.');
            if (parts.length >= 3) { // username.pds.domain
              const username = parts[0];
              const pdsAddress = parts.slice(1).join('.');
              
              // Check availability
              setProcessingId(didArgs); // Show loading state
              try {
                const did = await getDidByUsername(username, pdsAddress);
                // did is null means pds return error
                if (!did) {
                   if (!confirm(`The handle "${handle}" maybe still in use (registered on PDS). Are you sure you want to destroy the DID Cell? It is recommended to delete the PDS account first.`)) {
                     setProcessingId(null);
                     return;
                   }
                } else if (did !== '') {
                  // did is '' means username is not taken
                  if (!confirm(`The handle "${handle}" still in use (registered on PDS). Are you sure you want to destroy the DID Cell? It is recommended to delete the PDS account first.`)) {
                    setProcessingId(null);
                    return;
                  }
                }
              } catch (e) {
                // Ignore check errors, proceed to confirmation
                console.warn('Failed to check username availability before destroy', e);
              }
            }
          }
        }
      } catch {
        // Ignore metadata parse errors
      }
    }

    if (!confirm('Are you sure you want to destroy this DID? This action cannot be undone.')) {
      setProcessingId(null);
      return;
    }
    
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
  
  const handleUpdateHandle = async (didArgs: string, newHandle: string) => {
    if (!signer) return;
    setProcessingId(didArgs);
    setActionStatus(null);
    try {
      const hash = await updateHandle(signer, didArgs, newHandle);
      if (hash) {
        setActionStatus({ type: 'success', message: `Update Handle successful! Tx: ${hash}` });
        handleFetchList();
      } else {
        setActionStatus({ type: 'error', message: 'Update Handle failed' });
      }
    } catch (e: unknown) {
      setActionStatus({ type: 'error', message: e instanceof Error ? e.message : String(e) || 'Update Handle failed' });
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

  return (
    <div className="container">
      <div className="flex items-center gap-md mb-lg">
        <div className="bg-primary-light p-sm rounded text-primary" style={{ background: '#e0e7ff', color: '#4338ca' }}>
          <Fingerprint size={24} />
        </div>
        <div>
          <h2 className="m-0 text-lg">DID Manager</h2>
          <div className="text-muted text-sm">Manage your Decentralized Identifiers</div>
        </div>
      </div>

      {!wallet && (
        <div className="card text-center border-dashed">
           <div className="text-muted">Please connect your CKB wallet in the header.</div>
        </div>
      )}

      {/* Create DID Section */}
      {wallet && (
        <div className="card">
          <h3 className="flex items-center gap-sm mb-md text-sm">
            <FileJson size={18} />
            Create DID
          </h3>

          <div className="mb-md pb-md border-b border-slate-200">
            <div className="text-sm font-medium mb-sm">
              PDS Account Info
            </div>
            
            <div className="flex-col">
              <div>
                <label className="text-xs text-muted mb-sm block">PDS Address</label>
                <div className="badge badge-primary">
                  {pdsAddress}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted mb-sm block">Desired Username</label>
                <div className="badge badge-primary">
                  {pdsUsername || <span className="italic opacity-50">Not set</span>}
                </div>
              </div>
            </div>

            {(pdsUsername || resolvedPdsDid) && (
               <div className="mt-sm text-xs">
                 {isCheckingUsername ? (
                   <span className="text-muted flex items-center gap-sm">
                     <Loader size={12} className="spin" /> Resolving DID...
                   </span>
                 ) : !isAvailable ? (
                   <span className="text-danger italic">Not available</span>
                 ) : resolvedPdsDid ? (
                   <span className="text-success font-mono" title={resolvedPdsDid}>
                     DID: {resolvedPdsDid} (Taken)
                   </span>
                 ) : (
                   <span className="text-muted italic flex items-center gap-sm">
                     <CheckCircle size={12} className="text-success" /> No DID found (Available)
                   </span>
                 )}
               </div>
            )}
          </div>

          <div className="mb-md">
            <div className="text-sm font-medium mb-sm">DID Metadata (JSON)</div>
            <textarea
              className="input font-mono input-area"
              rows={10}
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div className="mb-md">
            <button 
              className="btn btn-primary"
              onClick={handleBuildTx}
              disabled={buildStatus === 'building'}
            >
              {buildStatus === 'building' ? <Loader size={16} className="spin" /> : <Hammer size={16} />}
              Construct Transaction
            </button>
          </div>

          {buildStatus === 'error' && (
            <div className="badge badge-error mb-md w-full">
              Error: {buildError}
            </div>
          )}

          {buildStatus === 'success' && (
            <div className="mb-lg p-md bg-slate-50 rounded-md border border-slate-200" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
              <div className="mb-sm font-medium text-primary" style={{ color: '#0369a1' }}>Transaction Constructed Successfully</div>
              
              <div className="mb-sm overflow-hidden">
                <div className="text-xs text-muted uppercase font-bold mb-sm">Generated DID</div>
                <div className="font-mono bg-white p-sm rounded border border-slate-200 text-xs break-all">
                  {generatedDid}
                </div>
              </div>

              <div className="mb-md">
                <div className="text-xs text-muted uppercase font-bold mb-sm">Raw Transaction</div>
                <div className="font-mono bg-white p-sm rounded border border-slate-200 text-xs max-h-[300px] overflow-auto break-all" style={{ maxHeight: '300px', whiteSpace: 'pre-wrap' }}>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(rawTx), null, 2);
                    } catch (e: unknown) {
                      return e instanceof Error ? e.message : String(e) || rawTx;
                    }
                  })()}
                </div>
              </div>

              <div className="mb-md">
                <div className="text-xs text-muted mb-sm">
                  Send the transaction to CKB to register your DID.
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSendTx}
                  disabled={sendStatus === 'sending'}
                >
                  {sendStatus === 'sending' ? <Loader size={16} className="spin" /> : <Send size={16} />}
                  Send Transaction
                </button>

                {sendStatus === 'error' && (
                  <div className="mt-sm text-danger text-sm">
                    Send failed: {sendError}
                  </div>
                )}

                {sendStatus === 'success' && (
                  <div className="mt-sm text-success text-sm font-bold">
                    Transaction Sent! Hash: {txHash}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My DIDs Section */}
      {wallet && (
        <div className="mt-lg">
          <div className="flex justify-between items-center mb-md gap-sm">
            <h3 className="flex items-center gap-sm text-sm m-0">
              <Fingerprint size={18} />
              My DIDs
            </h3>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleFetchList}
              disabled={loadingList}
            >
              <RefreshCw size={14} className={loadingList ? 'spin' : ''} />
              Refresh List
            </button>
          </div>

          {actionStatus && (
            <div className={`mb-md p-md rounded text-sm ${actionStatus.type === 'success' ? 'badge-success' : 'badge-error'}`} style={{ display: 'block' }}>
              {actionStatus.message}
            </div>
          )}

          {didList.length === 0 && !loadingList ? (
            <div className="text-center p-lg text-muted bg-slate-50 rounded border border-dashed border-slate-300">
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
                  onUpdateHandle={handleUpdateHandle}
                  onDestroy={handleDestroy}
                  processing={processingId === item.args}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
