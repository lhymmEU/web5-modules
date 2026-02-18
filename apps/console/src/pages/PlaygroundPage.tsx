import { useState } from 'react'
import {
  PenTool, ShieldCheck, Fingerprint, Loader,
  Check, Lightbulb,
} from 'lucide-react'
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc'
import { useKeystore } from '@/contexts/KeystoreContext'
import { DidManager } from '@/components/DidManager'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { concepts } from '@/content/concepts'
import type { AsyncStatus } from '@/types'

function CryptoExercises() {
  const { client, connected, didKey } = useKeystore()

  const [signStatus, setSignStatus] = useState<AsyncStatus>('idle')
  const [signMsg, setSignMsg] = useState('Hello Web5')
  const [signResult, setSignResult] = useState('')
  const [verifyStatus, setVerifyStatus] = useState<AsyncStatus>('idle')
  const [verifyDid, setVerifyDid] = useState(didKey || '')
  const [verifyMsg, setVerifyMsg] = useState('Hello Web5')
  const [verifySig, setVerifySig] = useState('')
  const [verifyResult, setVerifyResult] = useState('')

  const handleSign = async () => {
    if (!client) return
    setSignStatus('loading')
    try {
      const sig = await client.signMessage(bytesFrom(signMsg, 'utf8'))
      const hex = hexFrom(sig)
      setSignResult(hex)
      setVerifySig(hex)
      if (didKey) setVerifyDid(didKey)
      setVerifyMsg(signMsg)
      setSignStatus('success')
    } catch (e: unknown) {
      setSignResult(e instanceof Error ? e.message : String(e))
      setSignStatus('error')
    }
  }

  const handleVerify = async () => {
    if (!client) return
    setVerifyStatus('loading')
    try {
      const isValid = await client.verifySignature(verifyDid, bytesFrom(verifyMsg, 'utf8'), bytesFrom(verifySig))
      setVerifyResult(isValid ? 'Signature Valid' : 'Signature Invalid')
      setVerifyStatus(isValid ? 'success' : 'error')
    } catch (e: unknown) {
      setVerifyResult(e instanceof Error ? e.message : String(e))
      setVerifyStatus('error')
    }
  }

  if (!connected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Connect your keystore to use the crypto playground.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sign */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={1} title="Sign a Message" icon={PenTool} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{concepts.keys.sections.sign.description}</p>
          <div className="ml-10 space-y-3">
            {didKey && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fingerprint className="h-3 w-3" />
                Signing as <span className="font-mono">{didKey.slice(0, 16)}...{didKey.slice(-4)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Input value={signMsg} onChange={(e) => setSignMsg(e.target.value)} placeholder="Type a message to sign" className="flex-1" />
              <Button onClick={handleSign} disabled={signStatus === 'loading'}>
                {signStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Sign'}
              </Button>
            </div>
            {signStatus === 'success' && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="text-xs text-muted-foreground">Signature</div>
                <p className="font-mono text-xs break-all select-all">{signResult}</p>
              </div>
            )}
            {signStatus === 'error' && <ResultBlock status={signStatus} result={signResult} />}
          </div>
        </CardContent>
      </Card>

      {/* Verify */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={2} title="Verify a Signature" icon={ShieldCheck} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{concepts.keys.sections.verify.description}</p>
          <div className="ml-10 space-y-3">
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">DID Key</label>
                  {verifyDid === didKey && didKey && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from keystore</Badge>
                  )}
                </div>
                <Input value={verifyDid} onChange={(e) => setVerifyDid(e.target.value)} placeholder="did:key:..."
                  className={verifyDid === didKey && didKey ? 'border-primary/20 bg-primary/[0.03]' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">Message</label>
                  {signStatus === 'success' && verifyMsg === signMsg && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from step 1</Badge>
                  )}
                </div>
                <Input value={verifyMsg} onChange={(e) => setVerifyMsg(e.target.value)} placeholder="Original message"
                  className={signStatus === 'success' && verifyMsg === signMsg ? 'border-primary/20 bg-primary/[0.03]' : ''} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">Signature</label>
                  {verifySig === signResult && signStatus === 'success' && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from step 1</Badge>
                  )}
                </div>
                <Input value={verifySig} onChange={(e) => setVerifySig(e.target.value)} placeholder="Signature hex"
                  className={verifySig === signResult && signStatus === 'success' ? 'border-primary/20 bg-primary/[0.03]' : ''} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleVerify} disabled={verifyStatus === 'loading' || !verifyDid || !verifyMsg || !verifySig}>
                {verifyStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
              {verifyStatus !== 'idle' && <ResultBlock status={verifyStatus} result={verifyResult} />}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 shrink-0" />
              {concepts.keys.sections.verify.hint}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/30 p-5">
        <h3 className="text-sm font-semibold mb-3">{concepts.keys.sections.takeaways.title}</h3>
        <ul className="space-y-2">
          {concepts.keys.sections.takeaways.points.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Playground</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Experiment with cryptographic signing, manage your DIDs, and explore advanced operations.
        </p>
      </div>

      <div className="space-y-6">
        <Accordion type="multiple" defaultValue={['crypto']}>
          <AccordionItem value="crypto" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold py-3 hover:no-underline">
              Crypto Exercises
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <ErrorBoundary>
                <CryptoExercises />
              </ErrorBoundary>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dids" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold py-3 hover:no-underline">
              DID Management
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <ErrorBoundary>
                <DidManager />
              </ErrorBoundary>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  )
}
