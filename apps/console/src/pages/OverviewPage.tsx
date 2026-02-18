import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Fingerprint, Server, Search, Activity, ArrowRight, CheckCircle, XCircle } from 'lucide-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'

const modules = [
  {
    title: 'Keys & Identity',
    description: 'Learn about cryptographic keys and how they form the basis of self-sovereign identity.',
    icon: Shield,
    url: '/keys',
    step: 1,
  },
  {
    title: 'Decentralized IDs',
    description: 'Create a DID on the CKB blockchain -- your portable, self-owned identity.',
    icon: Fingerprint,
    url: '/dids',
    step: 2,
  },
  {
    title: 'Personal Data Server',
    description: 'Register on a PDS and manage your data in the AT Protocol ecosystem.',
    icon: Server,
    url: '/pds',
    step: 3,
  },
  {
    title: 'Explorer',
    description: 'Browse and inspect any user\'s public data repositories.',
    icon: Search,
    url: '/explorer',
    step: 4,
  },
  {
    title: 'Live Feed',
    description: 'Watch real-time events streaming across the AT Protocol network.',
    icon: Activity,
    url: '/feed',
    step: 5,
  },
]

export function OverviewPage() {
  const { connected, didKey } = useKeystore()
  const { wallet } = useCkbWallet()

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to Web5</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Web5 puts you in control of your identity and data. This interactive guide walks you through the core building blocks -- from cryptographic keys to decentralized data storage.
        </p>
      </div>

      {/* Prerequisites */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prerequisites</CardTitle>
          <CardDescription>These connections are needed for the interactive exercises.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Badge variant={wallet ? 'default' : 'secondary'} className="gap-1.5 py-1">
              {wallet ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              CKB Wallet
            </Badge>
            <Badge variant={connected ? 'default' : 'secondary'} className="gap-1.5 py-1">
              {connected ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              Keystore Bridge
            </Badge>
            <Badge variant={didKey ? 'default' : 'secondary'} className="gap-1.5 py-1">
              {didKey ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              DID Key Loaded
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Architecture overview */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-2 flex-wrap text-sm">
            <Badge variant="outline" className="text-sm py-1.5 px-3">Keystore</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm py-1.5 px-3">DID (CKB)</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm py-1.5 px-3">PDS (AT Proto)</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="text-sm py-1.5 px-3">Relayer</Badge>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Keys sign transactions → DIDs anchor identity on-chain → PDS stores your data → Relayers propagate events
          </p>
        </CardContent>
      </Card>

      {/* Module cards */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Learning Path</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((mod) => (
            <Link key={mod.url} to={mod.url} className="no-underline">
              <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                      <mod.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">Step {mod.step}</span>
                      </div>
                      <h3 className="font-semibold text-sm">{mod.title}</h3>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
