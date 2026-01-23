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
                <div className="logo-icon-wrapper">
                    <Wallet size={24} />
                </div>
                <span>Web5 Keystore</span>
            </div>
            <div className="badge">
                <ShieldCheck size={16} color="var(--success-color)" />
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
