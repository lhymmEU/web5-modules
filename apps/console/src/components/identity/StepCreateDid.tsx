import { Hammer, Loader, Send, CheckCircle } from 'lucide-react'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { AsyncStatus } from '@/types'

interface Props {
  metadata: string
  didCreated: boolean
  generatedDid: string
  txHash: string
  buildStatus: AsyncStatus
  buildError: string
  sendStatus: AsyncStatus
  sendError: string
  canBuild: boolean
  onBuild: () => void
  onSend: () => void
}

export function StepCreateDid({
  metadata, didCreated, generatedDid, txHash,
  buildStatus, buildError, sendStatus, sendError,
  canBuild, onBuild, onSend,
}: Props) {
  return (
    <>
      <StepHeader step={5} title="Create Your DID on CKB" icon={Hammer} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your DID is anchored on the CKB blockchain with metadata pointing to your PDS. This makes your identity tamper-proof and portable.
      </p>
      <div className="ml-10 space-y-4">
        {didCreated ? (
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
        ) : (
          <>
            <Accordion type="single" collapsible>
              <AccordionItem value="metadata" className="border rounded-lg px-3">
                <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                  Review DID Metadata (auto-generated from previous steps)
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60">{metadata}</pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {buildStatus !== 'success' ? (
              <div className="space-y-2">
                <Button onClick={onBuild} disabled={buildStatus === 'loading' || !canBuild}>
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
    </>
  )
}
