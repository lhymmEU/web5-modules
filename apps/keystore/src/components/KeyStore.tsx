import { useEffect, useRef, useState } from 'react';
import { Copy, Plus, Trash2, Key, Download, Upload, Check } from 'lucide-react';
import { decryptData, encryptData, generateSecp256k1KeyPair, importSecp256k1KeyPair } from '../utils/crypto';
import { 
  addKey, 
  deleteKey, 
  getAllKeys, 
  getActiveKey, 
  setActiveKey, 
  type KeyEntry
} from '../utils/storage';


export function KeyStore() {
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [activeKey, setActiveKeyLocal] = useState<KeyEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Native Dialog Refs
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const createKeyDialogRef = useRef<HTMLDialogElement | null>(null);
  const importKeyDialogRef = useRef<HTMLDialogElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);
  const dialogResolver = useRef<((value: string | null) => void) | null>(null);
  const [dialogTitle, setDialogTitle] = useState('');

  // Helper to open dialog and wait for result
  const requestPassword = (title: string): Promise<string | null> => {
    return new Promise((resolve) => {
      setDialogTitle(title);
      dialogResolver.current = resolve;
      if (dialogRef.current) {
        dialogRef.current.returnValue = ''; // Reset return value
        if (passwordInputRef.current) passwordInputRef.current.value = '';
        dialogRef.current.showModal();
      } else {
        resolve(null);
      }
    });
  };

  const handleDialogClose = () => {
     if (dialogResolver.current) {
        dialogResolver.current(dialogRef.current?.returnValue || null);
        dialogResolver.current = null;
     }
  };

  const handleDialogSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     const password = passwordInputRef.current?.value || '';
     dialogRef.current?.close(password);
  };

  // Create Key
  const [newKeyAlias, setNewKeyAlias] = useState('');
  
  // Import Key
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [importKeyAlias, setImportKeyAlias] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);

  const refreshFromStorage = () => {
    setKeys(getAllKeys());
    setActiveKeyLocal(getActiveKey());
  };

  useEffect(() => {
    refreshFromStorage();
  }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const keyPair = await generateSecp256k1KeyPair();
      addKey({
        privateKey: keyPair.privateKey,
        didKey: keyPair.didKey,
        createdAt: Date.now(),
      }, newKeyAlias);
      
      setNewKeyAlias('');
      createKeyDialogRef.current?.close();
      refreshFromStorage();
    } finally {
      setIsCreating(false);
    }
  };

  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importPrivateKey.trim()) {
      alert('Please enter a private key.');
      return;
    }
    
    setIsImporting(true);
    try {
      // Basic hex validation
      const hex = importPrivateKey.trim().startsWith('0x') ? importPrivateKey.trim().slice(2) : importPrivateKey.trim();
      if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error('Invalid private key format. Expected 64 hex characters.');
      }

      const keyPair = await importSecp256k1KeyPair(hex);
      addKey({
        privateKey: keyPair.privateKey,
        didKey: keyPair.didKey,
        createdAt: Date.now(),
      }, importKeyAlias);
      
      setImportPrivateKey('');
      setImportKeyAlias('');
      importKeyDialogRef.current?.close();
      refreshFromStorage();
    } catch (error) {
      console.error('Import failed:', error);
      alert(error instanceof Error ? error.message : 'Import failed. Check your private key.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = (id: string, alias: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete key "${alias}"? This action cannot be undone.`);
    if (!confirmed) return;
    deleteKey(id);
    refreshFromStorage();
  };

  const handleActivate = (id: string) => {
    setActiveKey(id);
    refreshFromStorage();
  };

  // --- Backup Logic ---
  
  const listLocalStorageKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }
    return keys;
  };

  const dumpLocalStorage = (): string => {
    const keys = listLocalStorageKeys();
    const entries: Record<string, string> = {};
    for (const key of keys) {
      entries[key] = localStorage.getItem(key) ?? '';
    }
    return JSON.stringify({ version: 2, exportedAt: Date.now(), entries });
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const onExport = async () => {
    const password = await requestPassword('Enter export password');
    if (!password) return;

    try {
      const plaintext = dumpLocalStorage();
      const encrypted = await encryptData(plaintext, password);
      if (encrypted === 'error') {
        alert('Encryption failed, please try again.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadTextFile(encrypted, `web5-keystore-backup-${date}.enc`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed.');
    }
  };

  const onImport = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (file: File) => {
    const encryptedFile = await file.text();
    const password = await requestPassword('Enter import password');
    if (!password) return;

    try {
      const decrypted = await decryptData(encryptedFile.trim(), password);
      if (decrypted === 'error') {
        alert('Decryption failed: incorrect password or corrupted file.');
        return;
      }

      const hasAnyExisting = localStorage.length > 0;
      if (hasAnyExisting) {
        const confirmed = window.confirm('Importing will merge with current keys. Existing keys with same ID will be preserved. Continue?');
        if (!confirmed) return;
      }

      const parsed = JSON.parse(decrypted);
      const entries = parsed.entries || {};
      
      const safeParse = (str: string | null, fallback: any) => {
         try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
      };

      const STATE_KEY = 'web5_keystore_state';
      const currentState = safeParse(localStorage.getItem(STATE_KEY), { keys: [], activeKeyId: null });
      const importedStateStr = entries[STATE_KEY];
      
      if (importedStateStr) {
         const importedState = safeParse(importedStateStr, { keys: [] });
         const existingIds = new Set(currentState.keys.map((k: any) => k.id));
         
         if (Array.isArray(importedState.keys)) {
            for (const key of importedState.keys) {
               if (!existingIds.has(key.id)) {
                  currentState.keys.push(key);
                  existingIds.add(key.id);
               }
            }
         }
         if (!currentState.activeKeyId && importedState.activeKeyId) {
             currentState.activeKeyId = importedState.activeKeyId;
         }
         
         localStorage.setItem(STATE_KEY, JSON.stringify(currentState));
      }

      const WHITELIST_KEY = 'web5_keystore_origin_whitelist';
      const currentWhitelist = safeParse(localStorage.getItem(WHITELIST_KEY), []);
      const importedWhitelistStr = entries[WHITELIST_KEY];
      
      if (importedWhitelistStr) {
         const importedWhitelist = safeParse(importedWhitelistStr, []);
         const mergedList = Array.from(new Set([...currentWhitelist, ...importedWhitelist]));
         localStorage.setItem(WHITELIST_KEY, JSON.stringify(mergedList));
      }

      for (const [key, value] of Object.entries(entries)) {
        if (key === STATE_KEY || key === WHITELIST_KEY) continue;
        if (localStorage.getItem(key) === null && typeof value === 'string') {
           localStorage.setItem(key, value);
        }
      }
      
      refreshFromStorage();
    } catch {
      alert('Import failed: invalid file format.');
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2">
          <div className="text-lg font-semibold">Signing Keys</div>
          <div className="text-secondary-sm">
            Manage your multiple identities and keys.
          </div>
        </div>
        <div className="flex gap-2">
           <button className="btn btn-primary" onClick={onExport} title="Export Keys">
             <Download size={16} /> Export
           </button>
           <button className="btn btn-primary" onClick={onImport} title="Import Keys">
             <Upload size={16} /> Import
           </button>
        </div>
      </div>

      {/* Keys List */}
      <div className="list-container">
        {keys.length === 0 && (
          <div className="empty-state-box">
            No keys found. Create one to get started.
          </div>
        )}
        
        {keys.map(key => {
          const isActive = activeKey?.id === key.id;
          return (
            <div key={key.id} className={`list-item ${isActive ? 'active' : ''}`}>
              <div className="list-item-info">
                <div className="list-item-header">
                  <Key size={18} color={isActive ? 'var(--success-color)' : 'var(--text-subtle)'} />
                  <span className="list-item-title">{key.alias}</span>
                  {isActive && <span className="badge-pill active">Active</span>}
                </div>
                <div className="list-item-subtitle" title={key.didKey}>
                  <span>{key.didKey}</span>
                </div>
              </div>
              
              <div className="list-item-actions">
                {!isActive && (
                  <button 
                    className="btn-icon"
                    title="Set as Active"
                    onClick={() => handleActivate(key.id)}
                  >
                    <Check size={16} />
                  </button>
                )}
                <button 
                  className="btn-icon" 
                  title="Copy DID"
                  onClick={async () => {
                     try {
                       await navigator.clipboard.writeText(key.didKey);
                       setCopySuccessId(key.id);
                       setTimeout(() => setCopySuccessId(null), 1200);
                     } catch {}
                  }}
                >
                  <Copy size={16} color={copySuccessId === key.id ? 'var(--success-color)' : 'currentColor'} />
                </button>
                <button 
                  className="btn-icon danger" 
                  title="Delete"
                  onClick={() => handleDelete(key.id, key.alias)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button 
          className="btn btn-success mt-4 flex items-center gap-2"
          onClick={() => createKeyDialogRef.current?.showModal()}
        >
          <Plus size={18} /> Create New Key
        </button>
        <button 
          className="btn btn-primary mt-4 flex items-center gap-2"
          onClick={() => importKeyDialogRef.current?.showModal()}
        >
          <Upload size={18} /> Import Private Key
        </button>
      </div>

      {/* Create Key Dialog */}
      <dialog ref={createKeyDialogRef} className="native-dialog">
        <form onSubmit={handleCreateKey} className="dialog-form">
          <h3>Create New Keypair</h3>
          <div className="input-group vertical mt-4">
            <label className="label">Alias (Optional)</label>
            <input 
              value={newKeyAlias}
              onChange={(e) => setNewKeyAlias(e.target.value)}
              placeholder="e.g. My Main Identity"
              autoFocus
              className="input"
            />
          </div>
          <div className="dialog-actions mt-6">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => createKeyDialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </dialog>

      {/* Import Key Dialog */}
      <dialog ref={importKeyDialogRef} className="native-dialog">
        <form onSubmit={handleImportKey} className="dialog-form">
          <h3>Import Private Key</h3>
          <div className="flex-col gap-4 mt-4">
            <div className="input-group vertical">
              <label className="label">Private Key (Hex)</label>
              <input 
                value={importPrivateKey}
                onChange={(e) => setImportPrivateKey(e.target.value)}
                placeholder="64-character hex string"
                autoFocus
                className="input"
              />
            </div>
            <div className="input-group vertical">
              <label className="label">Alias (Optional)</label>
              <input 
                value={importKeyAlias}
                onChange={(e) => setImportKeyAlias(e.target.value)}
                placeholder="e.g. My Imported Key"
                className="input"
              />
            </div>
          </div>
          <div className="dialog-actions mt-6">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => importKeyDialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isImporting}>
              {isImporting ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </dialog>

      {/* File Input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".enc,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onFileSelected(file);
        }}
      />

      {/* Native Password Dialog */}
      <dialog 
        ref={dialogRef} 
        onClose={handleDialogClose}
        className="native-dialog"
      >
        <form onSubmit={handleDialogSubmit} className="dialog-form">
          <h3 className="dialog-title">{dialogTitle}</h3>
          <input
            ref={passwordInputRef}
            type="password"
            autoFocus
            placeholder="Password"
            className="dialog-input"
          />
          <div className="dialog-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Confirm
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
