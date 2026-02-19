import { Wallet } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Props {
  walletDone: boolean
  address: string
  balance: string | null
  walletLoading: boolean
  formatAddress: (addr: string) => string
  openWallet: () => void
}

export function StepWallet({ walletDone, address, balance, walletLoading, formatAddress, openWallet }: Props) {
  return (
    <>
      <StepHeader step={3} title="Connect CKB Wallet" icon={Wallet} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your CKB wallet pays for on-chain transactions and signs DID operations. Connect it to proceed.
      </p>
      <div className="ml-10">
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
    </>
  )
}
