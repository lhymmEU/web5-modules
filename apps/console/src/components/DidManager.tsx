import { useMemo } from 'react'
import { Loader, FileJson, Send, Hammer, RefreshCw, CheckCircle } from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { useDidCreate } from '@/hooks/use-did-create'
import { useDidOperations } from '@/hooks/use-did-operations'
import { buildDidMetadata } from '@/lib/did-metadata'
import { DidItem } from '@/components/did/DidItem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

  const {
    didList, loadingList, processingId,
    destroyDialog, closeDestroyDialog,
    handleFetchList, handleTransfer,
    handleDestroy, confirmDestroy,
    handleUpdateKey, handleUpdateHandle,
  } = useDidOperations()

  const {
    buildStatus, rawTx, generatedDid, buildError,
    sendStatus, txHash, sendError,
    handleBuildTx, handleSendTx,
  } = useDidCreate()

  const metadata = useMemo(
    () => buildDidMetadata(pdsAddress, pdsUsername, didKey || ''),
    [pdsUsername, pdsAddress, didKey],
  )

  return (
    <div className="space-y-6">
      <AlertDialog open={destroyDialog.open} onOpenChange={(open) => !open && closeDestroyDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy DID Cell</AlertDialogTitle>
            <AlertDialogDescription>{destroyDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDestroy(signer)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                readOnly
              />
            </div>

            <Button onClick={() => handleBuildTx(signer, metadata)} disabled={buildStatus === 'loading'}>
              {buildStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
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
                      try { return JSON.stringify(JSON.parse(rawTx), null, 2) }
                      catch { return rawTx }
                    })()}
                  </pre>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Send the transaction to CKB to register your DID.
                  </p>
                  <Button onClick={() => handleSendTx(signer)} disabled={sendStatus === 'loading'}>
                    {sendStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
              <Button variant="outline" size="sm" onClick={() => handleFetchList(signer)} disabled={loadingList}>
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
                    onTransfer={(args, receiver) => handleTransfer(signer, args, receiver)}
                    onUpdateKey={(args, key) => handleUpdateKey(signer, args, key)}
                    onUpdateHandle={(args, handle) => handleUpdateHandle(signer, args, handle)}
                    onDestroy={(args) => handleDestroy(signer, args)}
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
