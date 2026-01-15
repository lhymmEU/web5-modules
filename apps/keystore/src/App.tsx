import { Wallet, ShieldCheck } from 'lucide-react';
import { KeyStore } from './components/KeyStore';
import { Signer } from './components/Signer';
import { WhitelistSettings } from './components/WhitelistSettings';

function App() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="header-content">
            <div className="logo">
                <div style={{ backgroundColor: '#2563eb', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>
                    <Wallet size={24} color="white" />
                </div>
                <span>Web5 Keystore</span>
            </div>
            <div className="badge">
                <ShieldCheck size={16} color="#16a34a" />
                <span>Secure Sandbox Environment</span>
            </div>
        </div>
      </header>

      <main className="container">
        <KeyStore />
        <Signer />
        <WhitelistSettings />
      </main>
    </div>
  );
}

export default App;
