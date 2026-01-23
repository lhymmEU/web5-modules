
import { Outlet, Link, useLocation } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { useKeystore } from './contexts/KeystoreContext';
import { usePds } from './contexts/PdsContext';
import { Wifi, WifiOff, Key, Wallet, LogOut, Loader, Server } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';
import { useState, useEffect } from 'react';
import { KEY_STORE_URL } from './constants/keystore';

export function Layout() {
  const location = useLocation();
  const { connected, didKey } = useKeystore();
  const { pdsUrl, setPdsUrl, availablePds } = usePds();
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
        const ckb = (Number(bal) / 100_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <div className="container">
      <div className="header-bar">
        <div className="header-logos">
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
          <h1>Web5 Console</h1>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {/* Row 1: CKB Wallet Status */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {wallet ? (
              <div className="wallet-badge" title={address}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Wallet size={16} />
                  <span>{loadingInfo ? <Loader size={12} className="spin" /> : formatAddress(address)}</span>
                </div>
                {balance && <span className="wallet-balance">{balance} CKB</span>}
                <button 
                  onClick={open}
                  className="disconnect-btn"
                  title="Wallet Settings"
                  style={{ marginLeft: '0.5rem' }}
                >
                  <Key size={12} />
                </button>
                <button 
                  onClick={disconnect}
                  className="disconnect-btn"
                  title="Disconnect Wallet"
                >
                  <LogOut size={12} />
                </button>
              </div>
          ) : (
            <button 
              className="connect-btn"
              onClick={open}
            >
              <Wallet size={16} /> Connect Wallet
            </button>
          )}
        </div>

        {/* Row 2: Keystore Status */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {didKey && (
            <div className="did-badge" title={didKey}>
              <Key size={16} />
              <span>{didKey.slice(0, 12)}...{didKey.slice(-6)}</span>
            </div>
          )}
          <a 
            href={KEY_STORE_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{connected ? 'Keystore' : 'Keystore Off'}</span>
          </a>
        </div>

        {/* Row 3: PDS Selector */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div className="pds-selector">
            <Server size={16} />
            <select 
              value={pdsUrl} 
              onChange={(e) => setPdsUrl(e.target.value)}
              style={{ border: 'none', background: 'transparent', color: '#1e293b', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
            >
              {availablePds.map(url => (
                <option key={url} value={url}>{url}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <nav className="nav-bar">
        <Link 
          to="/keys" 
          className={`nav-link ${location.pathname === '/keys' ? 'active' : ''}`}
        >
          Key Manager
        </Link>
        <Link 
          to="/dids" 
          className={`nav-link ${location.pathname === '/dids' ? 'active' : ''}`}
        >
          DID Manager
        </Link>
        <Link 
          to="/pds" 
          className={`nav-link ${location.pathname === '/pds' ? 'active' : ''}`}
        >
          PDS Manager
        </Link>
      </nav>

      <div className="content-area">
        <Outlet />
      </div>

      <style>{`
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .header-logos {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .connection-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all 0.3s;
        }
        .connection-badge.connected {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .connection-badge.disconnected {
          background-color: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .pds-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          font-size: 0.8rem;
          color: #475569;
        }
        .did-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: #f1f5f9;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          font-size: 0.8rem;
          font-family: monospace;
        }
        .wallet-badge {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.35rem 0.5rem 0.35rem 1rem;
          background-color: #e0e7ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .wallet-balance {
          font-family: monospace;
          background: #fff;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .connect-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 999px;
          font-size: 0.875rem;
          font-weight: 600;
          background-color: #4f46e5;
          color: white;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .connect-btn:hover {
          background-color: #4338ca;
        }
        .disconnect-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.5);
          color: #4338ca;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }
        .disconnect-btn:hover {
          background: #fff;
          color: #dc2626;
        }
        .nav-bar {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin: 0 0 2rem 0;
          padding: 0.5rem;
          background: #f1f5f9;
          border-radius: 8px;
          display: inline-flex;
        }
        .nav-link {
          padding: 0.5rem 1.5rem;
          text-decoration: none;
          color: #64748b;
          font-weight: 500;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .nav-link:hover {
          background: #e2e8f0;
          color: #334155;
        }
        .nav-link.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .content-area {
          margin-top: 2rem;
        }
      `}</style>
    </div>
  );
}


