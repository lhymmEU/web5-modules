
import { Routes, Route, Navigate } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import { Layout } from './Layout';
import { KeyManagerPage } from './pages/KeyManagerPage';
import { DidManagerPage } from './pages/DidManagerPage';
import { PdsManagerPage } from './pages/PdsManagerPage';
import { KeystoreProvider } from './contexts/KeystoreContext';
import { PdsProvider } from './contexts/PdsContext';

function App() {
  return (
    <ccc.Provider>
      <KeystoreProvider>
        <PdsProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/keys" replace />} />
              <Route path="keys" element={<KeyManagerPage />} />
              <Route path="dids" element={<DidManagerPage />} />
              <Route path="pds" element={<PdsManagerPage />} />
            </Route>
          </Routes>
        </PdsProvider>
      </KeystoreProvider>
    </ccc.Provider>
  );
}

export default App;
