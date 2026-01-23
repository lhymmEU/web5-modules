import { useEffect, useRef, useState } from 'react';
import { Copy, Plus, Trash2, Key } from 'lucide-react';
import { decryptData, encryptData, generateSecp256k1KeyPair } from '../utils/crypto';
import { 
  addKey, 
  deleteKey, 
  getAllKeys, 
  getActiveKey, 
  setActiveKey, 
  type KeyEntry
} from '../utils/storage';
import { PasswordModal } from './PasswordModal';

export function KeyStore() {
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [activeKey, setActiveKeyLocal] = useState<KeyEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // const [copyStatus, setCopyStatus] = useState<null | 'ok' | 'error'>(null);
  
  // Backup/Restore states
  const [passwordPrompt, setPasswordPrompt] = useState<null | { mode: 'export' | 'import'; encryptedFile?: string }>(null);
  const [passwordPromptBusy, setPasswordPromptBusy] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // New Key Modal
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyAlias, setNewKeyAlias] = useState('');

  const refreshFromStorage = () => {
    setKeys(getAllKeys());
    setActiveKeyLocal(getActiveKey());
  };

  useEffect(() => {
    refreshFromStorage();
  }, []);

  const handleCreateKey = async () => {
    setIsCreating(true);
    try {
      const keyPair = await generateSecp256k1KeyPair();
      addKey({
        privateKey: keyPair.privateKey,
        didKey: keyPair.didKey,
        createdAt: Date.now(),
      }, newKeyAlias);
      
      setNewKeyAlias('');
      setShowNewKeyModal(false);
      refreshFromStorage();
    } finally {
      setIsCreating(false);
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

  // --- Backup Logic (Simplified adapter for new storage format) ---
  
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

  const onExport = () => {
    setPasswordPromptError(null);
    setPasswordPrompt({ mode: 'export' });
  };

  const onImport = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (file: File) => {
    const encryptedFile = await file.text();
    setPasswordPromptError(null);
    setPasswordPrompt({ mode: 'import', encryptedFile });
  };

  const onPasswordConfirm = async (password: string) => {
    if (!passwordPrompt) return;
    setPasswordPromptBusy(true);
    setPasswordPromptError(null);
    try {
      if (passwordPrompt.mode === 'export') {
        const plaintext = dumpLocalStorage();
        const encrypted = await encryptData(plaintext, password);
        if (encrypted === 'error') {
          setPasswordPromptError('Encryption failed, please try again.');
          return;
        }
        const date = new Date().toISOString().slice(0, 10);
        downloadTextFile(encrypted, `web5-keystore-backup-${date}.enc`);
        setPasswordPrompt(null);
        return;
      }

      const encryptedFile = passwordPrompt.encryptedFile ?? '';
      const decrypted = await decryptData(encryptedFile.trim(), password);
      if (decrypted === 'error') {
        setPasswordPromptError('Decryption failed: incorrect password or corrupted file.');
        return;
      }

      const hasAnyExisting = localStorage.length > 0;
      if (hasAnyExisting) {
        const confirmed = window.confirm('Importing will merge with current keys. Existing keys with same ID will be preserved. Continue?');
        if (!confirmed) return;
      }

      // Simple import: just overwrite keys in localStorage
      const parsed = JSON.parse(decrypted);
      // Support v2 (entries) and v1 (legacy, though we dropped legacy support in code, keeping import generic)
      const entries = parsed.entries || {};
      
      // Helper to safe parse
      const safeParse = (str: string | null, fallback: any) => {
         try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
      };

      // --- Merge Keystore State ---
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
                  existingIds.add(key.id); // Update set just in case duplicates in import
               }
            }
         }
         // Preserve current active key, or use imported if none currently active
         if (!currentState.activeKeyId && importedState.activeKeyId) {
             currentState.activeKeyId = importedState.activeKeyId;
         }
         
         localStorage.setItem(STATE_KEY, JSON.stringify(currentState));
      }

      // --- Merge Whitelist ---
      const WHITELIST_KEY = 'web5_keystore_origin_whitelist';
      const currentWhitelist = safeParse(localStorage.getItem(WHITELIST_KEY), []);
      const importedWhitelistStr = entries[WHITELIST_KEY];
      
      if (importedWhitelistStr) {
         const importedWhitelist = safeParse(importedWhitelistStr, []);
         const mergedList = Array.from(new Set([...currentWhitelist, ...importedWhitelist]));
         localStorage.setItem(WHITELIST_KEY, JSON.stringify(mergedList));
      }

      // --- Merge Other Keys ---
      for (const [key, value] of Object.entries(entries)) {
        if (key === STATE_KEY || key === WHITELIST_KEY) continue;
        // Only add if not exists
        if (localStorage.getItem(key) === null && typeof value === 'string') {
           localStorage.setItem(key, value);
        }
      }
      
      refreshFromStorage();
      setPasswordPrompt(null);
    } catch {
      setPasswordPromptError('Import failed: invalid file format.');
    } finally {
      setPasswordPromptBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col gap-2">
          <div style={{ fontWeight: 600, fontSize: '1.2rem' }}>Signing Keys</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage your multiple identities and keys.
          </div>
        </div>
        <div className="flex gap-2">
           <button className="btn btn-brown" onClick={onExport}>Export</button>
           <button className="btn btn-brown-soft" onClick={onImport}>Import</button>
        </div>
      </div>

      {/* Keys List */}
      <div className="keys-list">
        {keys.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            No keys found. Create one to get started.
          </div>
        )}
        
        {keys.map(key => {
          const isActive = activeKey?.id === key.id;
          return (
            <div key={key.id} className={`key-item ${isActive ? 'active' : ''}`}>
              <div className="key-info">
                <div className="key-header">
                  <Key size={18} color={isActive ? '#166534' : '#64748b'} />
                  <span className="key-alias">{key.alias}</span>
                  {isActive && <span className="badge-active">Active</span>}
                </div>
                <div className="key-did" title={key.didKey}>{key.didKey}</div>
              </div>
              
              <div className="key-actions">
                {!isActive && (
                  <button 
                    className="btn-sm btn-outline"
                    onClick={() => handleActivate(key.id)}
                  >
                    Activate
                  </button>
                )}
                <button 
                  className="btn-icon" 
                  title="Copy DID"
                  onClick={async () => {
                     try {
                       await navigator.clipboard.writeText(key.didKey);
                       // simple toast could be here
                     } catch {}
                  }}
                >
                  <Copy size={16} />
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

      <button 
        className="btn btn-success mt-4 flex items-center gap-2"
        onClick={() => setShowNewKeyModal(true)}
      >
        <Plus size={18} /> Create New Key
      </button>

      {/* Create Key Modal */}
      {showNewKeyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create New Keypair</h3>
            <div className="input-group vertical" style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.9rem', color: '#64748b' }}>Alias (Optional)</label>
              <input 
                value={newKeyAlias}
                onChange={(e) => setNewKeyAlias(e.target.value)}
                placeholder="e.g. My Main Identity"
                autoFocus
              />
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowNewKeyModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateKey} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Input for Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".enc,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void onFileSelected(file);
        }}
      />

      {/* Password Prompt */}
      {passwordPrompt ? (
        <PasswordModal
          title={passwordPrompt.mode === 'export' ? 'Enter export password' : 'Enter import password'}
          confirmText={passwordPrompt.mode === 'export' ? 'Export' : 'Import'}
          busy={passwordPromptBusy}
          error={passwordPromptError}
          onCancel={() => {
            if (passwordPromptBusy) return;
            setPasswordPrompt(null);
            setPasswordPromptError(null);
          }}
          onConfirm={onPasswordConfirm}
        />
      ) : null}

      <style>{`
        .keys-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .key-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          transition: all 0.2s;
        }
        .key-item.active {
          border-color: #22c55e;
          background: #f0fdf4;
          box-shadow: 0 0 0 1px #22c55e;
        }
        .key-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .key-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .key-alias {
          font-weight: 600;
          color: #334155;
        }
        .key-did {
          font-family: monospace;
          font-size: 0.8rem;
          color: #64748b;
        }
        .badge-active {
          font-size: 0.7rem;
          background: #22c55e;
          color: white;
          padding: 0.1rem 0.4rem;
          border-radius: 999px;
          font-weight: 600;
        }
        .key-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.85rem;
        }
        .btn-outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .btn-outline:hover {
          background: #f1f5f9;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 400px;
          max-width: 90%;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
        }
        .w-full { width: 100%; }
        .mb-4 { margin-bottom: 1rem; }
      `}</style>
    </div>
  );
}

