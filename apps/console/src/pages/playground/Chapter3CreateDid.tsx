import { useMemo } from 'react'
import { Wallet, Loader, Hammer, Send, CheckCircle, FileJson } from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import { useDidCreate } from '@/hooks/use-did-create'
import { buildDidMetadata } from '@/lib/did-metadata'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ResultBlock } from '@/components/ui/step-flow'

export function Chapter3CreateDid({ onComplete }: { onComplete: () => void }) {
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

  const {
    buildStatus, rawTx, generatedDid, buildError,
    sendStatus, txHash, sendError,
    handleBuildTx, handleSendTx,
  } = useDidCreate()

  const metadata = useMemo(
    () => buildDidMetadata(pdsAddress, pdsUsername, didKey || ''),
    [pdsUsername, pdsAddress, didKey],
  )

  const walletDone = !!wallet && !!address

  const onBuild = () => handleBuildTx(signer, metadata)
  const onSend = async () => {
    await handleSendTx(signer)
    onComplete()
  }

  return (
    <div className="space-y-4">
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
              <Button onClick={onBuild} disabled={buildStatus === 'loading' || !signer}>
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
              <Button onClick={onSend} disabled={sendStatus === 'loading'}>
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
