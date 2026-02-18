import { useState, useEffect } from 'react'
import { Loader, FileJson, Send, Hammer, RefreshCw, Trash2, ArrowRight, Edit, CheckCircle } from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import {
  buildCreateTransaction,
  sendCkbTransaction,
  fetchDidCkbCellsInfo,
  type didCkbCellInfo,
  transferDidCell,
  updateHandle,
  destroyDidCell,
  updateDidKey,
} from 'did_module/logic'
import { getDidByUsername } from 'pds_module/logic'
import { usePds } from '@/contexts/PdsContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

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
      if (doc.verificationMethods?.atproto) {
        queueMicrotask(() => setNewKey(doc.verificationMethods.atproto))
      }
      if (doc.alsoKnownAs) {
        queueMicrotask(() => setNewHandle(doc.alsoKnownAs[0].replace('at://', '')))
      }
    } catch {
      // ignore
    }
  }, [item.didMetadata])

  return (
    <Card className="mb-3">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm break-all">{item.did}</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">
              Capacity: {item.capacity} CKB
            </div>
            <div className="text-xs text-muted-foreground font-mono break-all">
              OutPoint: {item.txHash}:{item.index}
            </div>
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
              <Button variant="outline" size="sm" onClick={() => setMode('view')} disabled={processing}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {mode === 'transfer' && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-2">
            <div className="text-sm font-medium">Transfer to Address</div>
            <div className="flex gap-2">
              <Input
                placeholder="ckb1..."
                value={transferAddr}
                onChange={(e) => setTransferAddr(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled={!transferAddr || processing}
                onClick={() => onTransfer(item.args, transferAddr)}
              >
                Transfer
              </Button>
            </div>
          </div>
        )}

        {mode === 'update' && (
          <div className="rounded-md border bg-muted/50 p-3 space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Update Atproto Key</div>
              <div className="flex gap-2">
                <Input
                  placeholder="did:key:..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="flex-1"
                />
                <Button disabled={!newKey || processing} onClick={() => onUpdateKey(item.args, newKey)}>
                  Update
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Update Handle</div>
              <div className="flex gap-2">
                <Input
                  placeholder="alice.example.com"
                  value={newHandle}
                  onChange={(e) => setNewHandle(e.target.value)}
                  className="flex-1"
                />
                <Button disabled={!newHandle || processing} onClick={() => onUpdateHandle(item.args, newHandle)}>
                  Update
                </Button>
              </div>
            </div>
          </div>
        )}

        <Accordion type="single" collapsible>
          <AccordionItem value="metadata" className="border-none">
            <AccordionTrigger className="text-xs text-muted-foreground py-1 hover:no-underline">
              Show Metadata
            </AccordionTrigger>
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

export function DidManager() {
  const { wallet } = ccc.useCcc()
  const signer = ccc.useSigner()
  const { didKey } = useKeystore()
  const {
    pdsUrl: pdsAddress,
    username: pdsUsername,
    resolvedDid: resolvedPdsDid,
    isResolving: isCheckingUsername,
    isAvailable,
  } = usePds()

  const [didList, setDidList] = useState<didCkbCellInfo[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [metadata, setMetadata] = useState(
    JSON.stringify(
      {
        services: {
          atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://pds.example.com' },
        },
        alsoKnownAs: ['at://alice.example.com'],
        verificationMethods: { atproto: 'did:key:zQ3shvzLcx2TeGmV33sPsVieaXWdjYwAcGXfiVgSyfhe6JdHh' },
      },
      null,
      2,
    ),
  )

  const [buildStatus, setBuildStatus] = useState<'idle' | 'building' | 'success' | 'error'>('idle')
  const [rawTx, setRawTx] = useState('')
  const [generatedDid, setGeneratedDid] = useState('')
  const [buildError, setBuildError] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [txHash, setTxHash] = useState('')
  const [sendError, setSendError] = useState('')

  // Destroy confirmation dialog state
  const [destroyDialog, setDestroyDialog] = useState<{
    open: boolean
    args: string
    message: string
  }>({ open: false, args: '', message: '' })

  useEffect(() => {
    try {
      const current = JSON.parse(metadata)
      let changed = false

      const userName = pdsUsername.toLowerCase()
      const handle = pdsUsername && pdsAddress ? `${userName}.${pdsAddress}` : 'alice.example.com'
      let endpoint = pdsAddress ? pdsAddress : 'https://pds.example.com'
      if (endpoint !== 'https://pds.example.com' && !endpoint.startsWith('http')) {
        endpoint = `https://${endpoint}`
      }

      if (!current.services) current.services = {}
      if (!current.services.atproto_pds) current.services.atproto_pds = { type: 'AtprotoPersonalDataServer' }
      if (current.services.atproto_pds.endpoint !== endpoint) {
        current.services.atproto_pds.endpoint = endpoint
        changed = true
      }

      const newAka = `at://${handle}`
      if (!current.alsoKnownAs || !Array.isArray(current.alsoKnownAs)) {
        current.alsoKnownAs = [newAka]
        changed = true
      } else if (current.alsoKnownAs[0] !== newAka) {
        current.alsoKnownAs[0] = newAka
        changed = true
      }

      if (didKey) {
        if (!current.verificationMethods) current.verificationMethods = {}
        if (current.verificationMethods.atproto !== didKey) {
          current.verificationMethods.atproto = didKey
          changed = true
        }
      }

      if (changed) setMetadata(JSON.stringify(current, null, 2))
    } catch {
      // ignore parse errors during auto-update
    }
  }, [metadata, pdsUsername, pdsAddress, didKey])

  const handleFetchList = async () => {
    if (!signer) return
    setLoadingList(true)
    setDidList([])
    try {
      const list = await fetchDidCkbCellsInfo(signer)
      setDidList(list)
    } catch {
      toast.error('Failed to fetch DID list')
    } finally {
      setLoadingList(false)
    }
  }

  const handleTransfer = async (didArgs: string, receiver: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await transferDidCell(signer, didArgs, receiver)
      if (hash) {
        toast.success(`Transfer successful! Tx: ${hash}`)
        handleFetchList()
      } else {
        toast.error('Transfer failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setProcessingId(null)
    }
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
              if (did !== '') {
                warningMessage = `The handle "${handle}" may still be in use (registered on PDS). It is recommended to delete the PDS account first. Destroy anyway?`
              }
            } catch {
              // ignore check errors
            }
          }
        }
      } catch {
        // ignore parse errors
      }
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
      if (hash) {
        toast.success(`Destroy successful! Tx: ${hash}`)
        handleFetchList()
      } else {
        toast.error('Destroy failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Destroy failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUpdateKey = async (didArgs: string, newKey: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateDidKey(signer, didArgs, newKey)
      if (hash) {
        toast.success(`Update Key successful! Tx: ${hash}`)
        handleFetchList()
      } else {
        toast.error('Update Key failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update Key failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleUpdateHandle = async (didArgs: string, newHandle: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateHandle(signer, didArgs, newHandle)
      if (hash) {
        toast.success(`Update Handle successful! Tx: ${hash}`)
        handleFetchList()
      } else {
        toast.error('Update Handle failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update Handle failed')
    } finally {
      setProcessingId(null)
    }
  }

  const handleBuildTx = async () => {
    if (!signer) return
    setBuildStatus('building')
    setBuildError('')
    setRawTx('')
    setGeneratedDid('')
    try {
      const { rawTx: tx, did } = await buildCreateTransaction(signer, metadata)
      setRawTx(tx)
      setGeneratedDid(did)
      setBuildStatus('success')
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : 'Failed to build transaction')
      setBuildStatus('error')
    }
  }

  const handleSendTx = async () => {
    if (!signer || !rawTx) return
    setSendStatus('sending')
    setSendError('')
    setTxHash('')
    try {
      const txObj = JSON.parse(rawTx)
      const hash = await sendCkbTransaction(signer, txObj)
      setTxHash(hash)
      setSendStatus('success')
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'Failed to send transaction')
      setSendStatus('error')
    }
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={destroyDialog.open} onOpenChange={(open) => !open && setDestroyDialog({ open: false, args: '', message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy DID Cell</AlertDialogTitle>
            <AlertDialogDescription>{destroyDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDestroy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Destroy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!wallet && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Please connect your CKB wallet in the header.
          </CardContent>
        </Card>
      )}

      {wallet && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileJson className="h-4 w-4" /> Create DID
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <div className="text-sm font-medium">DID Metadata (JSON)</div>
              <Textarea
                className="font-mono text-xs min-h-[200px]"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
              />
            </div>

            <Button onClick={handleBuildTx} disabled={buildStatus === 'building'}>
              {buildStatus === 'building' ? <Loader className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
              Construct Transaction
            </Button>

            {buildStatus === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>{buildError}</AlertDescription>
              </Alert>
            )}

            {buildStatus === 'success' && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="font-medium text-sm text-primary">Transaction Constructed Successfully</div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Generated DID</div>
                  <div className="font-mono bg-background p-2 rounded border text-xs break-all">{generatedDid}</div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase font-semibold">Raw Transaction</div>
                  <pre className="font-mono bg-background p-2 rounded border text-xs max-h-[300px] overflow-auto break-all whitespace-pre-wrap">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(rawTx), null, 2)
                      } catch {
                        return rawTx
                      }
                    })()}
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Send the transaction to CKB to register your DID.
                  </p>
                  <Button onClick={handleSendTx} disabled={sendStatus === 'sending'}>
                    {sendStatus === 'sending' ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Transaction
                  </Button>

                  {sendStatus === 'error' && (
                    <Alert variant="destructive">
                      <AlertDescription>Send failed: {sendError}</AlertDescription>
                    </Alert>
                  )}

                  {sendStatus === 'success' && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription className="font-mono text-xs break-all">
                        Transaction Sent! Hash: {txHash}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wallet && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">My DIDs</CardTitle>
              <Button variant="outline" size="sm" onClick={handleFetchList} disabled={loadingList}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {didList.length === 0 && !loadingList ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
                No DIDs found. Click "Refresh" to fetch or create one above.
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
