import { Wifi, WifiOff, Loader } from 'lucide-react'
import { KEY_STORE_URL } from 'keystore/constants'
import { StepHeader } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AsyncStatus } from '@/types'

interface Props {
  connected: boolean
  pingStatus: AsyncStatus
  pingResult: string
  onPing: () => void
}

export function StepKeystore({ connected, pingStatus, pingResult, onPing }: Props) {
  return (
    <>
      <StepHeader step={1} title="Connect to Your Keystore" icon={connected ? Wifi : WifiOff} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your keystore is a secure, isolated app that holds your private keys. It runs on its own origin so your keys never leave it.
      </p>
      <div className="ml-10">
        {connected ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="default" className="gap-1.5">
              <Wifi className="h-3 w-3" /> Connected
            </Badge>
            <Button variant="ghost" size="sm" onClick={onPing} disabled={pingStatus === 'loading'} className="text-xs h-7">
              {pingStatus === 'loading' ? <Loader className="h-3 w-3 animate-spin" /> : 'Test Connection'}
            </Button>
            {pingStatus === 'success' && <span className="text-xs text-muted-foreground">{pingResult} response time</span>}
            {pingStatus === 'error' && <span className="text-xs text-destructive">{pingResult}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="destructive" className="gap-1.5">
              <WifiOff className="h-3 w-3" /> Disconnected
            </Badge>
            <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs h-7">Open Keystore</Button>
            </a>
            <span className="text-xs text-muted-foreground">Open the keystore app, then this page will auto-connect.</span>
          </div>
        )}
      </div>
    </>
  )
}
