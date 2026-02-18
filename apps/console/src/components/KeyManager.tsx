import { useState } from 'react'
import { useKeystore } from '@/contexts/KeystoreContext'
import {
  Wifi, WifiOff, Loader, Fingerprint, PenTool,
  ShieldCheck, Check, Lightbulb,
} from 'lucide-react'
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { KEY_STORE_URL } from 'keystore/constants'
import { concepts } from '@/content/concepts'
import { StepHeader, FlowArrow, ResultBlock } from '@/components/ui/step-flow'
import type { AsyncStatus } from '@/types'

const copy = concepts.keys.sections

export function KeyManager() {
  const { client, connected } = useKeystore()

  const [pingStatus, setPingStatus] = useState<AsyncStatus>('idle')
  const [pingResult, setPingResult] = useState('')
  const [didStatus, setDidStatus] = useState<AsyncStatus>('idle')
  const [didResult, setDidResult] = useState('')
  const [signStatus, setSignStatus] = useState<AsyncStatus>('idle')
  const [signMsg, setSignMsg] = useState('Hello Web5')
  const [signResult, setSignResult] = useState('')
  const [verifyStatus, setVerifyStatus] = useState<AsyncStatus>('idle')
  const [verifyDid, setVerifyDid] = useState('')
  const [verifyMsg, setVerifyMsg] = useState('Hello Web5')
  const [verifySig, setVerifySig] = useState('')
  const [verifyResult, setVerifyResult] = useState('')

  const handlePing = async () => {
    if (!client) return
    setPingStatus('loading')
    try {
      const duration = await client.ping()
      setPingResult(`${duration.toFixed(1)}ms`)
      setPingStatus('success')
    } catch (e: unknown) {
      setPingResult(e instanceof Error ? e.message : String(e))
      setPingStatus('error')
    }
  }

  const handleGetDID = async () => {
    if (!client) return
    setDidStatus('loading')
    try {
      const did = await client.getDIDKey()
      if (did) {
        setDidResult(did)
        setVerifyDid(did)
        setDidStatus('success')
      } else {
        setDidResult('No DID returned (Key not created?)')
        setDidStatus('error')
      }
    } catch (e: unknown) {
      setDidResult(e instanceof Error ? e.message : String(e))
      setDidStatus('error')
    }
  }

  const handleSign = async () => {
    if (!client) return
    setSignStatus('loading')
    try {
      const sig = await client.signMessage(bytesFrom(signMsg, 'utf8'))
      setSignResult(hexFrom(sig))
      setVerifySig(hexFrom(sig))
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

  const didResolved = didStatus === 'success' && didResult

  return (
    <div className="space-y-2">
      {/* Step 1: Connection */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={1} title={copy.connection.title} icon={connected ? Wifi : WifiOff} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{copy.connection.description}</p>

          <div className="ml-10">
            {connected ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="default" className="gap-1.5">
                  <Wifi className="h-3 w-3" />
                  Connected
                </Badge>
                <Button variant="ghost" size="sm" onClick={handlePing} disabled={pingStatus === 'loading'} className="text-xs h-7">
                  {pingStatus === 'loading' ? <Loader className="h-3 w-3 animate-spin" /> : 'Test Connection'}
                </Button>
                {pingStatus === 'success' && (
                  <span className="text-xs text-muted-foreground">{pingResult} response time</span>
                )}
                {pingStatus === 'error' && (
                  <span className="text-xs text-destructive">{pingResult}</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="destructive" className="gap-1.5">
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </Badge>
                <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs h-7">Open Keystore</Button>
                </a>
                <span className="text-xs text-muted-foreground">{copy.connection.disconnectedCta}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FlowArrow />

      {/* Step 2: Identity */}
      <Card className={!connected ? 'opacity-50 pointer-events-none' : ''}>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={2} title={copy.identity.title} icon={Fingerprint} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{copy.identity.description}</p>

          <div className="ml-10">
            {didResolved ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="text-xs text-muted-foreground mb-1">Your DID Key</div>
                  <p className="font-mono text-xs break-all select-all">{didResult}</p>
                </div>
                <p className="text-xs text-muted-foreground">{copy.identity.explanation}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={handleGetDID} disabled={!connected || didStatus === 'loading'} size="sm">
                  {didStatus === 'loading' && <Loader className="h-3.5 w-3.5 animate-spin" />}
                  {copy.identity.action}
                </Button>
                {didStatus === 'error' && (
                  <ResultBlock status={didStatus} result={didResult} />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <FlowArrow />

      {/* Step 3: Sign */}
      <Card className={!didResolved ? 'opacity-50 pointer-events-none' : ''}>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={3} title={copy.sign.title} icon={PenTool} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{copy.sign.description}</p>

          <div className="ml-10 space-y-3">
            {didResolved && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Fingerprint className="h-3 w-3" />
                Signing as <span className="font-mono">{didResult.slice(0, 16)}...{didResult.slice(-4)}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={signMsg}
                onChange={(e) => setSignMsg(e.target.value)}
                placeholder="Type a message to sign"
                className="flex-1"
              />
              <Button onClick={handleSign} disabled={!didResolved || signStatus === 'loading'}>
                {signStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Sign'}
              </Button>
            </div>

            {signStatus === 'success' && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="text-xs text-muted-foreground">Signature</div>
                <p className="font-mono text-xs break-all select-all">{signResult}</p>
              </div>
            )}
            {signStatus === 'error' && (
              <ResultBlock status={signStatus} result={signResult} />
            )}
          </div>
        </CardContent>
      </Card>

      <FlowArrow />

      {/* Step 4: Verify */}
      <Card className={!didResolved ? 'opacity-50 pointer-events-none' : ''}>
        <CardContent className="pt-5 pb-5">
          <StepHeader step={4} title={copy.verify.title} icon={ShieldCheck} />
          <p className="text-sm text-muted-foreground ml-10 mb-3">{copy.verify.description}</p>

          <div className="ml-10 space-y-3">
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">DID Key</label>
                  {verifyDid === didResult && didResolved && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from step 2</Badge>
                  )}
                </div>
                <Input
                  value={verifyDid}
                  onChange={(e) => setVerifyDid(e.target.value)}
                  placeholder="did:key:..."
                  className={verifyDid === didResult && didResolved ? 'border-primary/20 bg-primary/[0.03]' : ''}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">Message</label>
                  {signStatus === 'success' && verifyMsg === signMsg && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from step 3</Badge>
                  )}
                </div>
                <Input
                  value={verifyMsg}
                  onChange={(e) => setVerifyMsg(e.target.value)}
                  placeholder="Original message"
                  className={signStatus === 'success' && verifyMsg === signMsg ? 'border-primary/20 bg-primary/[0.03]' : ''}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <label className="text-xs font-medium">Signature</label>
                  {verifySig === signResult && signStatus === 'success' && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">from step 3</Badge>
                  )}
                </div>
                <Input
                  value={verifySig}
                  onChange={(e) => setVerifySig(e.target.value)}
                  placeholder="Signature hex"
                  className={verifySig === signResult && signStatus === 'success' ? 'border-primary/20 bg-primary/[0.03]' : ''}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleVerify} disabled={!connected || verifyStatus === 'loading' || !verifyDid || !verifyMsg || !verifySig}>
                {verifyStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
              {verifyStatus !== 'idle' && (
                <ResultBlock status={verifyStatus} result={verifyResult} />
              )}
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 shrink-0" />
              {copy.verify.hint}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Takeaways */}
      <div className="rounded-lg border bg-muted/30 p-5 mt-4">
        <h3 className="text-sm font-semibold mb-3">{copy.takeaways.title}</h3>
        <ul className="space-y-2">
          {copy.takeaways.points.map((point, i) => (
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
