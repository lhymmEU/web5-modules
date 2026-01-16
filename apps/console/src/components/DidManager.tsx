
import { useKeystore } from '../contexts/KeystoreContext';
import { Fingerprint, Check, AlertCircle } from 'lucide-react';

export function DidManager() {
  const { connected, didKey } = useKeystore();

  return (
  );
}
