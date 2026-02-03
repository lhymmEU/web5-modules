
import { Routes, Route, Navigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import { Layout } from './Layout';
import { KeyManagerPage } from './pages/KeyManagerPage';
import { DidManagerPage } from './pages/DidManagerPage';
import { PdsManagerPage } from './pages/PdsManagerPage';
import { PdsBrowserPage } from './pages/PdsBrowserPage';
import { RelayerPage } from './pages/RelayerPage';
import { KeystoreProvider } from './contexts/KeystoreContext';
import { PdsProvider } from './contexts/PdsContext';

function App() {
  return (
    <ccc.Provider
      clientOptions={[
        {
          name: 'Testnet',
          client: new ccc.ClientPublicTestnet(),
        },
        {
          name: 'Mainnet',
          client: new ccc.ClientPublicMainnet(),
        },
      ]}
    >
      <KeystoreProvider>
        <PdsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/keys" replace />} />
              <Route path="keys" element={<KeyManagerPage />} />
              <Route path="dids" element={<DidManagerPage />} />
              <Route path="pds" element={<PdsManagerPage />} />
              <Route path="browser" element={<PdsBrowserPage />} />
              <Route path="relayer" element={<RelayerPage />} />
            </Route>
          </Routes>
        </PdsProvider>
      </KeystoreProvider>
    </ccc.Provider>
  );
}

export default App;
