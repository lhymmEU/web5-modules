import { Wifi, WifiOff, Wallet, Key, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useKeystore } from '@/contexts/KeystoreContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import { KEY_STORE_URL } from 'keystore/constants'
import w5Logo from '@/assets/w5-logo.svg'

export function Header() {
  const { connected, didKey } = useKeystore()
  const { wallet, open, disconnect, address, balance, loading, formatAddress } = useCkbWallet()

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 bg-background">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <a href="https://web5.fans" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <img src={w5Logo} className="h-7" alt="Web5" />
        <span className="font-semibold text-lg hidden sm:inline">Web5 Learn</span>
      </a>

      <div className="ml-auto flex items-center gap-2">
        <TooltipProvider delayDuration={200}>
          {/* Keystore status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Badge variant={connected ? 'default' : 'destructive'} className="gap-1 cursor-pointer">
                  {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  <span className="hidden sm:inline">{connected ? 'Keystore' : 'Disconnected'}</span>
                </Badge>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              {connected
                ? didKey ? `Connected: ${didKey.slice(0, 16)}...` : 'Connected to keystore'
                : 'Keystore disconnected. Click to open.'}
            </TooltipContent>
          </Tooltip>

          {/* Wallet status */}
          {wallet ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 cursor-pointer" onClick={open}>
                  <Wallet className="h-3 w-3" />
                  {loading ? <Loader className="h-3 w-3 animate-spin" /> : (
                    <>
                      <span className="font-mono text-xs">{formatAddress(address)}</span>
                      {balance && <span className="text-xs opacity-70">{balance} CKB</span>}
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="space-y-1">
                <p className="font-mono text-xs break-all">{address}</p>
                <Button variant="ghost" size="sm" onClick={disconnect} className="w-full text-xs">Disconnect</Button>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="outline" size="sm" onClick={open} className="gap-1">
              <Wallet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </Button>
          )}

          {/* DID Key indicator */}
          {didKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="gap-1 hidden md:flex">
                  <Key className="h-3 w-3" />
                  <span className="font-mono text-xs">{didKey.slice(0, 12)}...{didKey.slice(-4)}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs break-all max-w-xs">{didKey}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </div>
    </header>
  )
}
