import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AVAILABLE_PDS } from '../constants/pds';

interface PdsContextType {
  pdsUrl: string;
  setPdsUrl: (url: string) => void;
  availablePds: string[];
}

const PdsContext = createContext<PdsContextType | null>(null);

export function PdsProvider({ children }: { children: ReactNode }) {
  const [pdsUrl, setPdsUrl] = useState<string>(() => {
    return localStorage.getItem('web5_console_pds_url') || AVAILABLE_PDS[0];
  });

  useEffect(() => {
    localStorage.setItem('web5_console_pds_url', pdsUrl);
  }, [pdsUrl]);

  return (
    <PdsContext.Provider value={{ pdsUrl, setPdsUrl, availablePds: AVAILABLE_PDS }}>
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
