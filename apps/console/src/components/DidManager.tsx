
import { useState } from 'react';
import { useKeystore } from '../contexts/KeystoreContext';
import { Fingerprint, Loader, Check, AlertCircle } from 'lucide-react';

export function DidManager() {
  const { client, connected } = useKeystore();
  const [did, setDid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDid = async () => {
    if (!client || !connected) return;
    setLoading(true);
    setError(null);
    try {
      const result = await client.getDIDKey();
      if (result) {
        setDid(result);
      } else {
        setError('No DID found. Please ensure a key is active in Keystore.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load DID');
    } finally {
      setLoading(false);
    }
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
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Manage and view your Decentralized Identifiers</div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <button 
          className="btn btn-primary"
          onClick={loadDid}
          disabled={!connected || loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {loading ? <Loader size={16} className="spin" /> : <Fingerprint size={16} />}
          Fetch Active DID
        </button>
      </div>

      {error && (
        <div style={{ 
          background: '#fef2f2', 
          color: '#991b1b', 
          padding: '1rem', 
          borderRadius: '6px',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {did && (
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '1.5rem' 
        }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.5rem' }}>
            Active DID (did:key)
          </div>
          <div style={{ 
            fontFamily: 'monospace', 
            background: '#ffffff', 
            padding: '1rem', 
            borderRadius: '6px', 
            border: '1px solid #cbd5e1',
            wordBreak: 'break-all',
            color: '#334155',
            display: 'flex',
            alignItems: 'start',
            gap: '1rem'
          }}>
            <div style={{ flex: 1 }}>{did}</div>
            <div style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
              <Check size={14} /> Active
            </div>
          </div>
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
      `}</style>
    </div>
  );
}
