import { useState } from 'react'
import { Fingerprint, Loader } from 'lucide-react'
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc'
import { useKeystore } from '@/contexts/KeystoreContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResultBlock } from '@/components/ui/step-flow'
import type { AsyncStatus } from '@/types'
import type { SignData } from './types'

export function Chapter1Sign({ onComplete }: { onComplete: (data: SignData) => void }) {
  const { client, connected, didKey } = useKeystore()
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [message, setMessage] = useState('Hello Web5')
  const [result, setResult] = useState('')

  if (!connected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Connect your keystore to begin this chapter.
        </CardContent>
      </Card>
    )
  }

  const handleSign = async () => {
    if (!client) return
    setStatus('loading')
    try {
      const sig = await client.signMessage(bytesFrom(message, 'utf8'))
      const hex = hexFrom(sig)
      setResult(hex)
      setStatus('success')
      onComplete({ message, signature: hex, didKey: didKey || '' })
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  return (
    <div className="space-y-4">
      {didKey && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Fingerprint className="h-3 w-3" />
          Signing as <span className="font-mono">{didKey.slice(0, 16)}...{didKey.slice(-4)}</span>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message to sign"
          className="flex-1"
        />
        <Button onClick={handleSign} disabled={status === 'loading'}>
          {status === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Sign'}
        </Button>
      </div>
      {status === 'success' && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
          <div className="text-xs text-muted-foreground">Signature</div>
          <p className="font-mono text-xs break-all select-all">{result}</p>
        </div>
      )}
      {status === 'error' && <ResultBlock status={status} result={result} />}
    </div>
  )
}
