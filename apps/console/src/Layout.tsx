
import { Outlet, Link, useLocation } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { useKeystore } from './contexts/KeystoreContext';
import { usePds } from './contexts/PdsContext';
import { Wifi, WifiOff, Key, Wallet, LogOut, Loader, Server } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';
import { useState, useEffect } from 'react';
import { KEY_STORE_URL } from 'keystore/constants';

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
      
      <div className="flex-col mb-lg gap-sm ml-auto items-end">
        {/* Row 1: CKB Wallet Status */}
        {wallet ? (
            <div className="badge justify-between" title={address}>
              <div className="flex gap-sm">
                <Wallet size={16} />
                <span>{loadingInfo ? <Loader size={12} className="spin" /> : formatAddress(address)}</span>
              </div>
              <div className="flex gap-sm items-center">
                {balance && <span className="text-xs font-mono bg-white px-1 rounded">{balance} CKB</span>}
                <button 
                  onClick={open}
                  className="btn btn-sm btn-secondary border-none bg-transparent p-0"
                  title="Wallet Settings"
                >
                  <Key size={12} />
                </button>
                <button 
                  onClick={disconnect}
                  className="btn btn-sm btn-secondary border-none bg-transparent p-0"
                  title="Disconnect Wallet"
                >
                  <LogOut size={12} />
                </button>
              </div>
            </div>
        ) : (
          <button 
            className="btn btn-primary btn-sm"
            onClick={open}
          >
            <Wallet size={16} /> Connect Wallet
          </button>
        )}

        {/* Row 2: Keystore Status */}
        <div className="flex gap-md items-center justify-end">
          {didKey && (
            <div className="badge" title={didKey}>
              <Key size={16} />
              <span className="font-mono">{didKey.slice(0, 12)}...{didKey.slice(-6)}</span>
            </div>
          )}
          <a 
            href={KEY_STORE_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`badge ${connected ? 'badge-success' : 'badge-error'} cursor-pointer`}
            style={{ textDecoration: 'none' }}
          >
            {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </a>
        </div>

        {/* Row 3: PDS Selector */}
        <div className="badge">
          <Server size={16} />
          <select 
            value={pdsUrl} 
            onChange={(e) => setPdsUrl(e.target.value)}
            className="border-none bg-transparent text-inherit font-medium cursor-pointer outline-none"
          >
            {availablePds.map(url => (
              <option key={url} value={url}>{url}</option>
            ))}
          </select>
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
    </div>
  );
}


