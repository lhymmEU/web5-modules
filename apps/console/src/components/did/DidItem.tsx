import { useState, useEffect } from 'react'
import { Edit, ArrowRight, Trash2 } from 'lucide-react'
import type { didCkbCellInfo } from 'did_module/logic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export function DidItem({ item, onTransfer, onUpdateKey, onUpdateHandle, onDestroy, processing }: {
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
