
import { useState, useEffect } from 'react';
import { Fingerprint, Wallet, Loader } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';

export function DidManager() {
  const { wallet, open, disconnect } = ccc.useCcc();
  const signer = ccc.useSigner();
  
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [loadingInfo, setLoadingInfo] = useState(false);

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

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 16) return addr;
    return `${addr.slice(0, 8)}......${addr.slice(-8)}`;
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
          <div style={{ color: '#64748b', fontSize: '0.875rem' }}>View your Decentralized Identifiers</div>
        </div>
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
                  // Optional: Toast here
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
