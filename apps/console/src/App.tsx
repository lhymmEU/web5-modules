
import { Routes, Route } from 'react-router-dom';
import './App.css';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { KeyManagerPage } from './pages/KeyManagerPage';
import { KeystoreProvider } from './contexts/KeystoreContext';

function App() {
  return (
    <KeystoreProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="keys" element={<KeyManagerPage />} />
        </Route>
      </Routes>
    </KeystoreProvider>
  );
}

export default App;
