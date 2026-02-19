import { Fingerprint, ExternalLink, RefreshCw, Loader } from 'lucide-react'
import { KEY_STORE_URL } from 'keystore/constants'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AsyncStatus } from '@/types'

interface Props {
  connected: boolean
  didKeyDone: boolean
  effectiveDidKey: string
  noKeyYet: boolean
  didKeyStatus: AsyncStatus
  didKeyResult: string
  onGetDIDKey: () => void
}

export function StepDidKey({ connected, didKeyDone, effectiveDidKey, noKeyYet, didKeyStatus, didKeyResult, onGetDIDKey }: Props) {
  return (
    <>
      <StepHeader step={2} title="Your DID Key" icon={Fingerprint} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your identity is a DID key derived from your private key. It encodes your public key in a portable format that anyone can use to verify you.
      </p>
      <div className="ml-10">
        {didKeyDone ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground mb-1">Your DID Key</div>
              <p className="font-mono text-xs break-all select-all">{effectiveDidKey}</p>
            </div>
            <p className="text-xs text-muted-foreground">This is your public identity. Anyone can use it to verify messages you sign.</p>
          </div>
        ) : noKeyYet ? (
          <div className="space-y-3">
            <Alert>
              <Fingerprint className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">No key found in your keystore</p>
                <p className="text-xs text-muted-foreground mb-2">
                  You need to create a key in the keystore app first. Open the keystore, click "Create Key", then come back here.
                </p>
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 flex-wrap">
              <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Keystore
                </Button>
              </a>
              <Button onClick={onGetDIDKey} size="sm" variant="default" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Check Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={onGetDIDKey} disabled={!connected || didKeyStatus === 'loading'} size="sm">
              {didKeyStatus === 'loading' && <Loader className="h-3.5 w-3.5 animate-spin" />}
              Reveal My DID Key
            </Button>
            {didKeyStatus === 'error' && <ResultBlock status={didKeyStatus} result={didKeyResult} />}
          </div>
        )}
      </div>
    </>
  )
}
