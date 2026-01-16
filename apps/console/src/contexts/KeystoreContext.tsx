
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { KeystoreClient } from '../utils/KeystoreClient';

interface KeystoreContextType {
  client: KeystoreClient | null;
  connected: boolean;
  logs: string[];
  addLog: (msg: string) => void;
}

const KeystoreContext = createContext<KeystoreContextType | null>(null);

export function KeystoreProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<KeystoreClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    // Initialize client only once
    const c = new KeystoreClient('http://localhost:3001/bridge.html');
    setClient(c);
    addLog('Global Client initialized, connecting...');

    let isMounted = true;

    c.connect()
      .then(() => {
        if (isMounted) {
          setConnected(true);
          addLog('Connected to Keystore Bridge (Global)');
        }
      })
      .catch((err) => {
        if (isMounted) {
          addLog(`Global Connection failed: ${err.message}`);
        }
      });

    return () => {
      isMounted = false;
      c.disconnect();
      setConnected(false);
      addLog('Global Client disconnected');
    };
  }, []);

  return (
    <KeystoreContext.Provider value={{ client, connected, logs, addLog }}>
      {children}
    </KeystoreContext.Provider>
  );
}

export function useKeystore() {
  const context = useContext(KeystoreContext);
  if (!context) {
    throw new Error('useKeystore must be used within a KeystoreProvider');
  }
  return context;
}
