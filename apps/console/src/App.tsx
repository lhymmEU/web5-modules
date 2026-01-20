
import { Routes, Route } from 'react-router-dom';
import { ccc } from '@ckb-ccc/connector-react';
import './App.css';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { KeyManagerPage } from './pages/KeyManagerPage';
import { DidManagerPage } from './pages/DidManagerPage';
import { PdsManagerPage } from './pages/PdsManagerPage';
import { KeystoreProvider } from './contexts/KeystoreContext';

function App() {
  return (
    <ccc.Provider>
      <KeystoreProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="keys" element={<KeyManagerPage />} />
            <Route path="dids" element={<DidManagerPage />} />
            <Route path="pds" element={<PdsManagerPage />} />
          </Route>
        </Routes>
      </KeystoreProvider>
    </ccc.Provider>
  );
}

export default App;
