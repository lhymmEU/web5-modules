import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  PenTool, ShieldCheck, Fingerprint, Loader, Lock,
  Check, Lightbulb, ChevronLeft, ChevronRight, ArrowLeft,
  Hammer, Send, Wallet, RefreshCw, Trash2, ArrowRight, Edit,
  CheckCircle, Trophy, FileJson,
} from 'lucide-react'
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import {
  buildCreateTransaction,
  sendCkbTransaction,
  fetchDidCkbCellsInfo,
  type didCkbCellInfo,
  transferDidCell,
  updateHandle as updateDidHandle,
  destroyDidCell,
  updateDidKey,
} from 'did_module/logic'
import { getDidByUsername } from 'pds_module/logic'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ResultBlock } from '@/components/ui/step-flow'
import { concepts } from '@/content/concepts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AsyncStatus } from '@/types'

type ChapterId = 'sign' | 'verify' | 'create-did' | 'manage-did'

const CHAPTERS = concepts.playground.chapters
const CHAPTER_IDS: ChapterId[] = ['sign', 'verify', 'create-did', 'manage-did']
const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  'sign': PenTool,
  'verify': ShieldCheck,
  'create-did': Hammer,
  'manage-did': Trophy,
}

interface SignData {
  message: string
  signature: string
  didKey: string
}

interface DidOps {
  updateKey: boolean
  updateHandle: boolean
  transfer: boolean
  destroy: boolean
}

// ---------------------------------------------------------------------------
// Chapter 1: Sign
// ---------------------------------------------------------------------------

function Chapter1Sign({ onComplete }: { onComplete: (data: SignData) => void }) {
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

// ---------------------------------------------------------------------------
// Chapter 2: Verify
// ---------------------------------------------------------------------------

function Chapter2Verify({ signData, onComplete }: { signData: SignData | null; onComplete: () => void }) {
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

// ---------------------------------------------------------------------------
// Chapter 3: Create DID
// ---------------------------------------------------------------------------

function Chapter3CreateDid({ onComplete }: { onComplete: () => void }) {
  const signer = ccc.useSigner()
  const { didKey } = useKeystore()
  const { wallet, open: openWallet, address, balance, loading: walletLoading, formatAddress } = useCkbWallet()
  const {
    pdsUrl: pdsAddress,
    username: pdsUsername,
    resolvedDid: resolvedPdsDid,
    isResolving: isCheckingUsername,
    isAvailable,
  } = usePds()

  const metadata = useMemo(() => {
    const handle = pdsUsername && pdsAddress ? `${pdsUsername.toLowerCase()}.${pdsAddress}` : ''
    let endpoint = pdsAddress || ''
    if (endpoint && !endpoint.startsWith('http')) endpoint = `https://${endpoint}`
    return JSON.stringify({
      services: {
        atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint },
      },
      alsoKnownAs: handle ? [`at://${handle}`] : [],
      verificationMethods: { atproto: didKey || '' },
    }, null, 2)
  }, [pdsUsername, pdsAddress, didKey])

  const [buildStatus, setBuildStatus] = useState<AsyncStatus>('idle')
  const [rawTx, setRawTx] = useState('')
  const [generatedDid, setGeneratedDid] = useState('')
  const [buildError, setBuildError] = useState('')
  const [sendStatus, setSendStatus] = useState<AsyncStatus>('idle')
  const [txHash, setTxHash] = useState('')
  const [sendError, setSendError] = useState('')

  const handleBuildTx = async () => {
    if (!signer) return
    setBuildStatus('loading')
    setBuildError(''); setRawTx(''); setGeneratedDid('')
    try {
      const { rawTx: tx, did } = await buildCreateTransaction(signer, metadata)
      setRawTx(tx); setGeneratedDid(did); setBuildStatus('success')
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : String(e)); setBuildStatus('error')
    }
  }

  const handleSendTx = async () => {
    if (!signer || !rawTx) return
    setSendStatus('loading')
    setSendError(''); setTxHash('')
    try {
      const txObj = JSON.parse(rawTx)
      const hash = await sendCkbTransaction(signer, txObj)
      setTxHash(hash); setSendStatus('success'); onComplete()
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : String(e)); setSendStatus('error')
    }
  }

  const walletDone = !!wallet && !!address

  return (
    <div className="space-y-4">
      {/* Wallet connection */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-sm font-medium flex items-center gap-2">
          <Wallet className="h-4 w-4" /> CKB Wallet
        </div>
        {walletDone ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="default" className="gap-1.5">
              <Wallet className="h-3 w-3" /> Connected
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{formatAddress(address)}</span>
            {!walletLoading && balance && <span className="text-xs text-muted-foreground">{balance} CKB</span>}
          </div>
        ) : (
          <Button onClick={openWallet} size="sm" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Connect Wallet
          </Button>
        )}
      </div>

      {walletDone && (
        <>
          {/* PDS info */}
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">PDS Account Info</div>
            <div className="flex flex-wrap gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">PDS Address</div>
                <Badge variant="secondary">{pdsAddress}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Username</div>
                <Badge variant="secondary">{pdsUsername || <span className="italic opacity-50">Not set</span>}</Badge>
              </div>
            </div>
            {(pdsUsername || resolvedPdsDid) && (
              <div className="text-xs pt-1">
                {isCheckingUsername ? (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Loader className="h-3 w-3 animate-spin" /> Resolving DID...
                  </span>
                ) : !isAvailable ? (
                  <span className="text-destructive italic">Not available</span>
                ) : resolvedPdsDid ? (
                  <span className="text-amber-600 font-mono break-all" title={resolvedPdsDid}>
                    DID: {resolvedPdsDid} (Taken)
                  </span>
                ) : (
                  <span className="text-muted-foreground italic flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" /> No DID found (Available)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Metadata preview */}
          <Accordion type="single" collapsible>
            <AccordionItem value="metadata" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                <span className="flex items-center gap-2"><FileJson className="h-3.5 w-3.5" /> Review DID Metadata (auto-generated)</span>
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60">{metadata}</pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Build + Send */}
          {sendStatus === 'success' ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="font-medium text-sm text-primary flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> DID Created
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Your DID</div>
                <div className="font-mono bg-background p-2 rounded border text-xs break-all select-all">{generatedDid}</div>
              </div>
              <div className="text-xs text-muted-foreground font-mono break-all">Tx: {txHash}</div>
            </div>
          ) : buildStatus !== 'success' ? (
            <div className="space-y-2">
              <Button onClick={handleBuildTx} disabled={buildStatus === 'loading' || !signer}>
                {buildStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                Construct Transaction
              </Button>
              {buildStatus === 'error' && <ResultBlock status="error" result={buildError} />}
            </div>
          ) : (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="font-medium text-sm text-primary">Transaction Ready</div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Generated DID</div>
                <div className="font-mono bg-background p-2 rounded border text-xs break-all">{generatedDid}</div>
              </div>
              <Accordion type="single" collapsible>
                <AccordionItem value="raw-tx" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                    Raw Transaction
                  </AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60 break-all whitespace-pre-wrap">
                      {(() => { try { return JSON.stringify(JSON.parse(rawTx), null, 2) } catch { return rawTx } })()}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Button onClick={handleSendTx} disabled={sendStatus === 'loading'}>
                {sendStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Transaction
              </Button>
              {sendStatus === 'error' && <ResultBlock status="error" result={sendError} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chapter 4: Manage DIDs — DidItem sub-component
// ---------------------------------------------------------------------------

function DidItem({ item, onTransfer, onUpdateKey, onUpdateHandle, onDestroy, processing }: {
  item: didCkbCellInfo
  onTransfer: (args: string, receiver: string) => void
  onUpdateKey: (args: string, key: string) => void
  onUpdateHandle: (args: string, handle: string) => void
  onDestroy: (args: string) => void
  processing: boolean
}) {
  const [mode, setMode] = useState<'view' | 'transfer' | 'update'>('view')
  const [transferAddr, setTransferAddr] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newHandle, setNewHandle] = useState('')

  useEffect(() => {
    try {
      const doc = JSON.parse(item.didMetadata)
      if (doc.verificationMethods?.atproto) queueMicrotask(() => setNewKey(doc.verificationMethods.atproto))
      if (doc.alsoKnownAs) queueMicrotask(() => setNewHandle(doc.alsoKnownAs[0].replace('at://', '')))
    } catch { /* ignore */ }
  }, [item.didMetadata])

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm break-all">{item.did}</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">Capacity: {item.capacity} CKB</div>
            <div className="text-xs text-muted-foreground font-mono break-all">OutPoint: {item.txHash}:{item.index}</div>
          </div>
          <div className="flex gap-1 shrink-0">
            {mode === 'view' ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setMode('update')} disabled={processing} title="Update">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMode('transfer')} disabled={processing} title="Transfer">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDestroy(item.args)} disabled={processing} title="Destroy" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={processing}>Cancel</Button>
            )}
          </div>
        </div>

        {mode === 'transfer' && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-2">
            <div className="text-sm font-medium">Transfer to Address</div>
            <div className="flex gap-2">
              <Input placeholder="ckb1..." value={transferAddr} onChange={(e) => setTransferAddr(e.target.value)} className="flex-1" />
              <Button disabled={!transferAddr || processing} onClick={() => onTransfer(item.args, transferAddr)}>Transfer</Button>
            </div>
          </div>
        )}

        {mode === 'update' && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Update Atproto Key</div>
              <div className="flex gap-2">
                <Input placeholder="did:key:..." value={newKey} onChange={(e) => setNewKey(e.target.value)} className="flex-1" />
                <Button disabled={!newKey || processing} onClick={() => onUpdateKey(item.args, newKey)}>Update</Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Update Handle</div>
              <div className="flex gap-2">
                <Input placeholder="alice.example.com" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} className="flex-1" />
                <Button disabled={!newHandle || processing} onClick={() => onUpdateHandle(item.args, newHandle)}>Update</Button>
              </div>
            </div>
          </div>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem value="metadata" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground py-1 hover:no-underline">Show Metadata</AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(JSON.parse(item.didMetadata), null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Chapter 4: Manage DIDs
// ---------------------------------------------------------------------------

function Chapter4ManageDids({ ops, onOp }: { ops: DidOps; onOp: (op: keyof DidOps) => void }) {
  const signer = ccc.useSigner()
  const { wallet, open: openWallet, address, formatAddress } = useCkbWallet()

  const [didList, setDidList] = useState<didCkbCellInfo[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [destroyDialog, setDestroyDialog] = useState<{ open: boolean; args: string; message: string }>({
    open: false, args: '', message: '',
  })

  const handleFetchList = async () => {
    if (!signer) return
    setLoadingList(true); setDidList([])
    try {
      const list = await fetchDidCkbCellsInfo(signer)
      setDidList(list)
    } catch { toast.error('Failed to fetch DID list') }
    finally { setLoadingList(false) }
  }

  const handleTransfer = async (didArgs: string, receiver: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await transferDidCell(signer, didArgs, receiver)
      if (hash) { toast.success(`Transfer successful! Tx: ${hash}`); onOp('transfer'); handleFetchList() }
      else toast.error('Transfer failed')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Transfer failed') }
    finally { setProcessingId(null) }
  }

  const handleDestroy = async (didArgs: string) => {
    if (!signer) return
    const didItem = didList.find((item) => item.args === didArgs)
    let warningMessage = 'Are you sure you want to destroy this DID? This action cannot be undone.'
    if (didItem) {
      try {
        const meta = JSON.parse(didItem.didMetadata)
        if (meta.alsoKnownAs?.[0]?.startsWith('at://')) {
          const handle = meta.alsoKnownAs[0].replace('at://', '')
          const parts = handle.split('.')
          if (parts.length >= 3) {
            const username = parts[0]
            const pds = parts.slice(1).join('.')
            setProcessingId(didArgs)
            try {
              const did = await getDidByUsername(username, pds)
              if (did !== '') warningMessage = `The handle "${handle}" may still be in use (registered on PDS). It is recommended to delete the PDS account first. Destroy anyway?`
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
    setDestroyDialog({ open: true, args: didArgs, message: warningMessage })
  }

  const confirmDestroy = async () => {
    if (!signer) return
    const didArgs = destroyDialog.args
    setDestroyDialog({ open: false, args: '', message: '' })
    setProcessingId(didArgs)
    try {
      const hash = await destroyDidCell(signer, didArgs)
      if (hash) { toast.success(`Destroy successful! Tx: ${hash}`); onOp('destroy'); handleFetchList() }
      else toast.error('Destroy failed')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Destroy failed') }
    finally { setProcessingId(null) }
  }

  const handleUpdateKey = async (didArgs: string, newKey: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateDidKey(signer, didArgs, newKey)
      if (hash) { toast.success(`Update Key successful! Tx: ${hash}`); onOp('updateKey'); handleFetchList() }
      else toast.error('Update Key failed')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Update Key failed') }
    finally { setProcessingId(null) }
  }

  const handleUpdateHandle = async (didArgs: string, newHandle: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateDidHandle(signer, didArgs, newHandle)
      if (hash) { toast.success(`Update Handle successful! Tx: ${hash}`); onOp('updateHandle'); handleFetchList() }
      else toast.error('Update Handle failed')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Update Handle failed') }
    finally { setProcessingId(null) }
  }

  const walletDone = !!wallet && !!address
  const subtasks = CHAPTERS[3].subtasks

  return (
    <div className="space-y-4">
      <AlertDialog open={destroyDialog.open} onOpenChange={(open) => !open && setDestroyDialog({ open: false, args: '', message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy DID Cell</AlertDialogTitle>
            <AlertDialogDescription>{destroyDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDestroy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Destroy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sub-task checklist */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="text-sm font-medium">Operations Checklist</div>
        <div className="grid grid-cols-2 gap-2">
          {subtasks.map((task) => {
            const done = ops[task.id as keyof DidOps]
            return (
              <div key={task.id} className={cn(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
                done ? 'border-primary/30 bg-primary/5 text-primary' : 'text-muted-foreground',
              )}>
                {done ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2" />}
                {task.label}
              </div>
            )
          })}
        </div>
      </div>

      {/* Wallet */}
      {!walletDone ? (
        <div className="rounded-lg border p-4 space-y-2">
          <div className="text-sm font-medium flex items-center gap-2"><Wallet className="h-4 w-4" /> CKB Wallet</div>
          <Button onClick={openWallet} size="sm" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" /> Connect Wallet
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="font-mono text-xs text-muted-foreground">{formatAddress(address)}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleFetchList} disabled={loadingList}>
              <RefreshCw className={cn('h-3.5 w-3.5', loadingList && 'animate-spin')} />
              Refresh DIDs
            </Button>
          </div>

          {didList.length === 0 && !loadingList ? (
            <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
              No DIDs found. Click "Refresh DIDs" to fetch.
            </div>
          ) : (
            <div>
              {didList.map((item) => (
                <DidItem
                  key={`${item.txHash}-${item.index}`}
                  item={item}
                  onTransfer={handleTransfer}
                  onUpdateKey={handleUpdateKey}
                  onUpdateHandle={handleUpdateHandle}
                  onDestroy={handleDestroy}
                  processing={processingId === item.args}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chapter Cover (book cover card)
// ---------------------------------------------------------------------------

function ChapterCover({
  chapter,
  index,
  status,
  onClick,
}: {
  chapter: typeof CHAPTERS[number]
  index: number
  status: 'locked' | 'unlocked' | 'completed'
  onClick: () => void
}) {
  const Icon = CHAPTER_ICONS[CHAPTER_IDS[index]]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === 'locked'}
      className={cn(
        'relative flex flex-col items-center justify-between rounded-xl border-2 px-4 py-6 w-44 h-64 shrink-0 transition-all duration-300 text-center select-none',
        status === 'locked' && 'opacity-40 cursor-not-allowed border-muted bg-muted/30',
        status === 'unlocked' && 'border-primary bg-background shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer',
        status === 'completed' && 'border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10',
      )}
    >
      {/* Chapter number */}
      <span className={cn(
        'text-2xl font-bold tracking-wider',
        status === 'locked' ? 'text-muted-foreground/50' : 'text-primary',
      )}>
        {chapter.number}
      </span>

      {/* Icon */}
      <div className={cn(
        'flex items-center justify-center w-14 h-14 rounded-full',
        status === 'locked' ? 'bg-muted text-muted-foreground/50' : status === 'completed' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary',
      )}>
        {status === 'locked' ? <Lock className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h3 className={cn(
          'text-sm font-semibold leading-tight',
          status === 'locked' ? 'text-muted-foreground/60' : 'text-foreground',
        )}>
          {chapter.title}
        </h3>

        {/* Status badge */}
        {status === 'locked' && (
          <span className="text-[10px] text-muted-foreground">Locked</span>
        )}
        {status === 'unlocked' && (
          <Badge variant="default" className="text-[10px] h-5 px-2 animate-pulse">Begin</Badge>
        )}
        {status === 'completed' && (
          <Badge variant="secondary" className="text-[10px] h-5 px-2 gap-1 text-primary">
            <Check className="h-2.5 w-2.5" /> Complete
          </Badge>
        )}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function PlaygroundPage() {
  const [activeChapter, setActiveChapter] = useState<ChapterId | null>(null)
  const [completedChapters, setCompletedChapters] = useState<Set<ChapterId>>(new Set())
  const [signData, setSignData] = useState<SignData | null>(null)
  const [didOps, setDidOps] = useState<DidOps>({ updateKey: false, updateHandle: false, transfer: false, destroy: false })

  // Carousel refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)

  const scrollToCard = useCallback((index: number) => {
    setCarouselIndex(index)
    cardRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [])

  const completeChapter = useCallback((id: ChapterId) => {
    setCompletedChapters((prev) => new Set(prev).add(id))
  }, [])

  const chapterStatus = useCallback((id: ChapterId): 'locked' | 'unlocked' | 'completed' => {
    if (completedChapters.has(id)) return 'completed'
    const idx = CHAPTER_IDS.indexOf(id)
    if (idx === 0) return 'unlocked'
    const prev = CHAPTER_IDS[idx - 1]
    return completedChapters.has(prev) ? 'unlocked' : 'locked'
  }, [completedChapters])

  const handleDidOp = useCallback((op: keyof DidOps) => {
    setDidOps((prev) => {
      const next = { ...prev, [op]: true }
      if (next.updateKey && next.updateHandle && next.transfer && next.destroy) {
        completeChapter('manage-did')
      }
      return next
    })
  }, [completeChapter])

  const completedCount = completedChapters.size
  const nextChapter = activeChapter ? CHAPTER_IDS[CHAPTER_IDS.indexOf(activeChapter) + 1] as ChapterId | undefined : undefined

  // ---------------------------------------------------------------------------
  // Chapter Detail View
  // ---------------------------------------------------------------------------

  if (activeChapter) {
    const chapterIdx = CHAPTER_IDS.indexOf(activeChapter)
    const chapter = CHAPTERS[chapterIdx]
    const Icon = CHAPTER_ICONS[activeChapter]
    const isComplete = completedChapters.has(activeChapter)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveChapter(null)} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Chapter {chapter.number}</span>
              {isComplete && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1 text-primary">
                  <Check className="h-2.5 w-2.5" /> Complete
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary shrink-0" />
              {chapter.title}
            </h1>
          </div>
        </div>

        {/* Narrative */}
        <div className="rounded-lg border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{chapter.narrative}&rdquo;</p>
        </div>

        {/* Exercise */}
        <ErrorBoundary>
          {activeChapter === 'sign' && (
            <Chapter1Sign onComplete={(data) => { setSignData(data); completeChapter('sign') }} />
          )}
          {activeChapter === 'verify' && (
            <Chapter2Verify signData={signData} onComplete={() => completeChapter('verify')} />
          )}
          {activeChapter === 'create-did' && (
            <Chapter3CreateDid onComplete={() => completeChapter('create-did')} />
          )}
          {activeChapter === 'manage-did' && (
            <Chapter4ManageDids ops={didOps} onOp={handleDidOp} />
          )}
        </ErrorBoundary>

        {/* Completion banner */}
        {isComplete && (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Trophy className="h-5 w-5" />
              Chapter Complete!
            </div>
            <p className="text-sm text-muted-foreground">{chapter.completion}</p>
            <div className="flex gap-2">
              {nextChapter && chapterStatus(nextChapter) !== 'locked' && (
                <Button onClick={() => setActiveChapter(nextChapter)}>
                  Continue to Chapter {CHAPTERS[CHAPTER_IDS.indexOf(nextChapter)].number}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setActiveChapter(null)}>
                Back to Chapters
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Chapter Select View
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">{concepts.playground.title}</h1>
        <p className="text-sm text-muted-foreground max-w-xl">{concepts.playground.subtitle}</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Quest Progress</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(completedCount / CHAPTER_IDS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums">{completedCount}/{CHAPTER_IDS.length}</span>
      </div>

      {/* Carousel */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={() => scrollToCard(Math.max(0, carouselIndex - 1))}
          disabled={carouselIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-4 scrollbar-none px-1 justify-center sm:justify-start"
        >
          {CHAPTERS.map((chapter, i) => {
            const id = CHAPTER_IDS[i]
            const status = chapterStatus(id)
            return (
              <div
                key={id}
                ref={(el) => { cardRefs.current[i] = el as HTMLButtonElement | null }}
                className={cn(
                  'snap-center transition-all duration-300',
                  i === carouselIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-60',
                )}
                onClick={() => setCarouselIndex(i)}
              >
                <ChapterCover
                  chapter={chapter}
                  index={i}
                  status={status}
                  onClick={() => {
                    if (status !== 'locked') setActiveChapter(id)
                  }}
                />
              </div>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={() => scrollToCard(Math.min(CHAPTER_IDS.length - 1, carouselIndex + 1))}
          disabled={carouselIndex === CHAPTER_IDS.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile navigation */}
      <div className="flex items-center justify-center gap-4 sm:hidden">
        <Button variant="ghost" size="sm" onClick={() => scrollToCard(Math.max(0, carouselIndex - 1))} disabled={carouselIndex === 0}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">{carouselIndex + 1} / {CHAPTER_IDS.length}</span>
        <Button variant="ghost" size="sm" onClick={() => scrollToCard(Math.min(CHAPTER_IDS.length - 1, carouselIndex + 1))} disabled={carouselIndex === CHAPTER_IDS.length - 1}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Quest summary */}
      {completedCount === CHAPTER_IDS.length && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-2">
          <Trophy className="h-8 w-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Quest Complete!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You've mastered the building blocks of self-sovereign identity — from cryptographic signatures to on-chain DIDs to full sovereignty over your digital self.
          </p>
        </div>
      )}
    </div>
  )
}
