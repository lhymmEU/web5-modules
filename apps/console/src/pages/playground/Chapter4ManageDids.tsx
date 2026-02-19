import { Wallet, RefreshCw, CheckCircle } from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import { useDidOperations } from '@/hooks/use-did-operations'
import { DidItem } from '@/components/did/DidItem'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { concepts } from '@/content/concepts'
import { cn } from '@/lib/utils'
import type { DidOps } from './types'

const CHAPTERS = concepts.playground.chapters

export function Chapter4ManageDids({ ops, onOp }: { ops: DidOps; onOp: (op: keyof DidOps) => void }) {
  const signer = ccc.useSigner()
  const { wallet, open: openWallet, address, formatAddress } = useCkbWallet()
  const {
    didList, loadingList, processingId,
    destroyDialog, closeDestroyDialog,
    handleFetchList, handleTransfer,
    handleDestroy, confirmDestroy,
    handleUpdateKey, handleUpdateHandle,
  } = useDidOperations()

  const walletDone = !!wallet && !!address
  const subtasks = CHAPTERS[3].subtasks

  return (
    <div className="space-y-4">
      <AlertDialog open={destroyDialog.open} onOpenChange={(open) => !open && closeDestroyDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy DID Cell</AlertDialogTitle>
            <AlertDialogDescription>{destroyDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDestroy(signer)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Destroy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button variant="outline" size="sm" onClick={() => handleFetchList(signer)} disabled={loadingList}>
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
                  onTransfer={(args, receiver) => { handleTransfer(signer, args, receiver); onOp('transfer') }}
                  onUpdateKey={(args, key) => { handleUpdateKey(signer, args, key); onOp('updateKey') }}
                  onUpdateHandle={(args, handle) => { handleUpdateHandle(signer, args, handle); onOp('updateHandle') }}
                  onDestroy={(args) => { handleDestroy(signer, args); onOp('destroy') }}
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
