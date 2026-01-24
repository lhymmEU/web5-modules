import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
// @ts-ignore
import { AVAILABLE_PDS } from 'pds_module/constants';
import { AtpAgent } from 'web5-api';

interface PdsContextType {
  agent: AtpAgent | null;
  pdsUrl: string;
  setPdsUrl: (url: string) => void;
  availablePds: string[];
}

const PdsContext = createContext<PdsContextType | null>(null);

export function PdsProvider({ children }: { children: ReactNode }) {
  const [pdsUrl, setPdsUrl] = useState<string>(() => {
    return localStorage.getItem('web5_console_pds_url') || AVAILABLE_PDS[0];
  });

  const [agent, setAgent] = useState<AtpAgent | null>(null);

  useEffect(() => {
    localStorage.setItem('web5_console_pds_url', pdsUrl);
    try {
      const serviceUrl = pdsUrl.startsWith('http') ? pdsUrl : `https://${pdsUrl}`;
      const newAgent = new AtpAgent({ service: serviceUrl });
      setAgent(newAgent);
    } catch (e) {
      console.error('Failed to initialize AtpAgent', e);
      setAgent(null);
    }
  }, [pdsUrl]);

  return (
    <PdsContext.Provider value={{ agent, pdsUrl, setPdsUrl, availablePds: AVAILABLE_PDS }}>
      {children}
    </PdsContext.Provider>
  );
}

export function usePds() {
  const context = useContext(PdsContext);
  if (!context) {
    throw new Error('usePds must be used within a PdsProvider');
  }
  return context;
}
