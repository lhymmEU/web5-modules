import { useState } from 'react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { Check, AlertCircle, PenTool, CheckCircle, Loader } from 'lucide-react'
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AsyncStatus } from '@/types'

function StatusDisplay({ status, result }: { status: AsyncStatus; result: string }) {
  if (status === 'idle') return null
  if (status === 'loading') return <p className="text-sm text-muted-foreground italic">Processing...</p>
  const ok = status === 'success'
  return (
    <Alert variant={ok ? 'default' : 'destructive'} className="break-all">
      {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <AlertDescription className="font-mono text-xs">{result}</AlertDescription>
    </Alert>
  )
}

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
      setPingResult(`PONG in ${duration.toFixed(2)}ms`)
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Basic Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handlePing} disabled={!connected || pingStatus === 'loading'}>
              {pingStatus === 'loading' && <Loader className="h-3 w-3 animate-spin" />}
              Ping Bridge
            </Button>
            <StatusDisplay status={pingStatus} result={pingResult} />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleGetDID} disabled={!connected || didStatus === 'loading'}>
              {didStatus === 'loading' && <Loader className="h-3 w-3 animate-spin" />}
              Get DID Key
            </Button>
            <StatusDisplay status={didStatus} result={didResult} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <PenTool className="h-4 w-4" /> Sign Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Sign a message with your private key to create a cryptographic proof of authorship.</p>
          <div className="flex gap-2">
            <Input value={signMsg} onChange={(e) => setSignMsg(e.target.value)} placeholder="Message to sign" className="flex-1" />
            <Button onClick={handleSign} disabled={!connected || signStatus === 'loading'}>
              {signStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Sign'}
            </Button>
          </div>
          <StatusDisplay status={signStatus} result={signResult} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> Verify Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Verify that a signature was produced by the holder of a specific DID key.</p>
          <div className="space-y-2">
            <Input value={verifyDid} onChange={(e) => setVerifyDid(e.target.value)} placeholder="DID Key" />
            <Input value={verifyMsg} onChange={(e) => setVerifyMsg(e.target.value)} placeholder="Message" />
            <Input value={verifySig} onChange={(e) => setVerifySig(e.target.value)} placeholder="Signature Hex" />
            <div className="flex justify-end">
              <Button onClick={handleVerify} disabled={!connected || verifyStatus === 'loading'}>
                {verifyStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          </div>
          <StatusDisplay status={verifyStatus} result={verifyResult} />
        </CardContent>
      </Card>
    </div>
  )
}
