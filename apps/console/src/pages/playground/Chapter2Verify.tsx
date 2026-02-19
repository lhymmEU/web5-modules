import { useState } from 'react'
import { Lightbulb, Loader } from 'lucide-react'
import { bytesFrom } from '@ckb-ccc/ccc'
import { useKeystore } from '@/contexts/KeystoreContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ResultBlock } from '@/components/ui/step-flow'
import { concepts } from '@/content/concepts'
import type { AsyncStatus } from '@/types'
import type { SignData } from './types'

export function Chapter2Verify({ signData, onComplete }: { signData: SignData | null; onComplete: () => void }) {
  const { client, connected, didKey } = useKeystore()
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [verifyDid, setVerifyDid] = useState(signData?.didKey || didKey || '')
  const [verifyMsg, setVerifyMsg] = useState(signData?.message || 'Hello Web5')
  const [verifySig, setVerifySig] = useState(signData?.signature || '')
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

  const handleVerify = async () => {
    if (!client) return
    setStatus('loading')
    try {
      const isValid = await client.verifySignature(verifyDid, bytesFrom(verifyMsg, 'utf8'), bytesFrom(verifySig))
      setResult(isValid ? 'Signature Valid' : 'Signature Invalid')
      setStatus(isValid ? 'success' : 'error')
      if (isValid) onComplete()
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const fromPrevChapter = signData !== null

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-medium">DID Key</label>
            {fromPrevChapter && verifyDid === signData.didKey && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from Chapter I</Badge>
            )}
          </div>
          <Input
            value={verifyDid}
            onChange={(e) => setVerifyDid(e.target.value)}
            placeholder="did:key:..."
            className={fromPrevChapter && verifyDid === signData.didKey ? 'border-primary/20 bg-primary/[0.03]' : ''}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-medium">Message</label>
            {fromPrevChapter && verifyMsg === signData.message && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from Chapter I</Badge>
            )}
          </div>
          <Input
            value={verifyMsg}
            onChange={(e) => setVerifyMsg(e.target.value)}
            placeholder="Original message"
            className={fromPrevChapter && verifyMsg === signData.message ? 'border-primary/20 bg-primary/[0.03]' : ''}
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-medium">Signature</label>
            {fromPrevChapter && verifySig === signData.signature && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from Chapter I</Badge>
            )}
          </div>
          <Input
            value={verifySig}
            onChange={(e) => setVerifySig(e.target.value)}
            placeholder="Signature hex"
            className={fromPrevChapter && verifySig === signData.signature ? 'border-primary/20 bg-primary/[0.03]' : ''}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={handleVerify} disabled={status === 'loading' || !verifyDid || !verifyMsg || !verifySig}>
          {status === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Verify'}
        </Button>
        {status !== 'idle' && <ResultBlock status={status} result={result} />}
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Lightbulb className="h-3 w-3 shrink-0" />
        {concepts.keys.sections.verify.hint}
      </p>
    </div>
  )
}
