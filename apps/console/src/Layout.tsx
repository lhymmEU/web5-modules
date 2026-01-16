
import { Outlet, Link, useLocation } from 'react-router-dom';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import { useKeystore } from './contexts/KeystoreContext';
import { Wifi, WifiOff, Key } from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const { connected, didKey } = useKeystore();

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
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {didKey && (
            <div className="did-badge" title={didKey}>
              <Key size={16} />
              <span>{didKey.slice(0, 12)}...{didKey.slice(-6)}</span>
            </div>
          )}
          <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span>{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
      
      <nav className="nav-bar">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          Home
        </Link>
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


