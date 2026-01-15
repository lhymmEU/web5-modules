import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { decryptData, encryptData, generateSecp256k1KeyPair } from '../utils/crypto';
import { deleteSigningKey, getSigningKey, saveSigningKey, STORAGE_KEY_SIGNING_KEY } from '../utils/storage';
import { PasswordModal } from './PasswordModal';

export function KeyStore() {
  const [didKey, setDidKey] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copyStatus, setCopyStatus] = useState<null | 'ok' | 'error'>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<null | { mode: 'export' | 'import'; encryptedFile?: string }>(
    null
  );
  const [passwordPromptBusy, setPasswordPromptBusy] = useState(false);
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshFromStorage = () => {
    const existing = getSigningKey();
    if (existing?.didKey) {
      setDidKey(existing.didKey);
      setHasExistingKey(true);
      return;
    }
    setDidKey(null);
    setHasExistingKey(false);
  };

  useEffect(() => {
    refreshFromStorage();
  }, []);

  const onCreate = async () => {
    if (hasExistingKey) return;
    setIsCreating(true);
    try {
      const keyPair = await generateSecp256k1KeyPair();
      saveSigningKey({
        privateKey: keyPair.privateKey,
        didKey: keyPair.didKey,
        createdAt: Date.now(),
      });
      setDidKey(keyPair.didKey);
      setHasExistingKey(true);
    } finally {
      setIsCreating(false);
    }
  };

  const onDelete = () => {
    if (!hasExistingKey) return;
    const confirmed = window.confirm('Are you sure you want to delete the created key? This action cannot be undone.');
    if (!confirmed) return;
    deleteSigningKey();
    setDidKey(null);
    setHasExistingKey(false);
  };

  const listLocalStorageKeys = (): string[] => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      keys.push(key);
    }
    return keys;
  };

  const dumpLocalStorage = (): string => {
    const keys = listLocalStorageKeys();
    const entries: Record<string, string> = {};
    for (const key of keys) {
      entries[key] = localStorage.getItem(key) ?? '';
    }
    return JSON.stringify({ version: 1, exportedAt: Date.now(), entries });
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

  const clearLocalStorage = () => {
    localStorage.clear();
  };

  const parseBackupToEntries = (plaintext: string): Record<string, string> => {
    const parsed = JSON.parse(plaintext) as unknown;

    if (typeof parsed === 'object' && parsed !== null) {
      const maybeEntries = (parsed as { entries?: unknown }).entries;
      if (typeof maybeEntries === 'object' && maybeEntries !== null && !Array.isArray(maybeEntries)) {
        const entries: Record<string, string> = {};
        for (const [k, v] of Object.entries(maybeEntries as Record<string, unknown>)) {
          if (typeof k === 'string' && typeof v === 'string') entries[k] = v;
        }
        return entries;
      }

      const maybeSigningKey = parsed as { privateKey?: unknown; didKey?: unknown; createdAt?: unknown };
      if (typeof maybeSigningKey.privateKey === 'string' && typeof maybeSigningKey.didKey === 'string') {
        return { [STORAGE_KEY_SIGNING_KEY]: JSON.stringify(maybeSigningKey) };
      }
    }

    throw new Error('invalid backup format');
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
        const confirmed = window.confirm('Are you sure you want to import the backup? This action will overwrite any existing localStorage data.');
        if (!confirmed) return;
      }

      const entries = parseBackupToEntries(decrypted);
      clearLocalStorage();
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
      refreshFromStorage();
      setPasswordPrompt(null);
    } catch {
      setPasswordPromptError('Import failed: invalid file format or corrupted content.');
    } finally {
      setPasswordPromptBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <div style={{ fontWeight: 600 }}>Signing Key</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Create a secp256k1 keypair and store it locally.
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <div className="label">did:key</div>
        <div className="flex gap-2 items-center">
          <div className="code-block" style={{ flex: 1 }}>
            {didKey ? didKey : 'Did not create yet'}
          </div>
          <button
            type="button"
            className="btn-icon"
            aria-label="Copy did:key"
            disabled={!didKey}
            onClick={async () => {
              if (!didKey) return;
              try {
                await navigator.clipboard.writeText(didKey);
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
      </div>

      <div className="flex gap-2" style={{ marginTop: '1rem' }}>
        <button
          type="button"
          className="btn btn-success"
          onClick={onCreate}
          disabled={isCreating || hasExistingKey}
        >
          Create
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onDelete}
          disabled={!hasExistingKey || isCreating}
        >
          Delete
        </button>
        <button type="button" className="btn btn-brown" onClick={onExport} disabled={isCreating}>
          Export
        </button>
        <button type="button" className="btn btn-brown-soft" onClick={onImport} disabled={isCreating}>
          Import
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".enc,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          void onFileSelected(file);
        }}
      />
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
    </div>
  );
}
