import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
// @ts-ignore
import { AVAILABLE_PDS } from 'pds_module/constants';
import type { AtpAgent as AtpAgentType } from 'web5-api';

interface PdsContextType {
  agent: AtpAgentType | null;
  pdsUrl: string;
  setPdsUrl: (url: string) => void;
  availablePds: string[];
}

const PdsContext = createContext<PdsContextType | null>(null);

export function PdsProvider({ children }: { children: ReactNode }) {
  const [pdsUrl, setPdsUrl] = useState<string>(() => {
    return localStorage.getItem('web5_console_pds_url') || AVAILABLE_PDS[0];
  });

  const [agent, setAgent] = useState<AtpAgentType | null>(null);

  useEffect(() => {
    localStorage.setItem('web5_console_pds_url', pdsUrl);
    let cancelled = false;
    (async () => {
      try {
        const serviceUrl = pdsUrl.startsWith('http') ? pdsUrl : `https://${pdsUrl}`;
        const mod = await import('web5-api');
        const Ctor =
          typeof (mod as any).AtpAgent === 'function'
            ? (mod as any).AtpAgent
            : typeof (mod as any).default === 'function'
              ? (mod as any).default
              : null;
        if (!Ctor) {
          throw new TypeError('web5-api exports do not include AtpAgent constructor');
        }
        const newAgent = new Ctor({ service: serviceUrl }) as AtpAgentType;
        if (!cancelled) {
          setAgent(newAgent);
        }
      } catch (e) {
        console.error('Failed to initialize AtpAgent', e);
        if (!cancelled) {
          setAgent(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
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
