import { LogIn, LogOut, CheckCircle, Loader } from 'lucide-react'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { sessionInfo } from 'pds_module/logic'
import type { AsyncStatus } from '@/types'

interface Props {
  loginStatus: AsyncStatus
  loginError: string
  session: sessionInfo | null
  loggedIn: boolean
  onLogin: () => void
  onLogout: () => void
}

export function StepSignIn({ loginStatus, loginError, session, loggedIn, onLogin, onLogout }: Props) {
  return (
    <>
      <StepHeader step={7} title="Sign In to PDS" icon={LogIn} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Authenticate with your PDS using your DID and keystore. No passwords needed -- your cryptographic keys prove your identity.
      </p>
      <div className="ml-10 space-y-3">
        {loggedIn ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="default" className="gap-1.5">
              <CheckCircle className="h-3 w-3" /> Signed In as @{session!.handle}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs h-7">
              <LogOut className="h-3 w-3" /> Sign Out
            </Button>
          </div>
        ) : (
          <>
            <Button onClick={onLogin} disabled={loginStatus === 'loading'}>
              {loginStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign In
            </Button>
            {loginStatus === 'error' && <ResultBlock status="error" result={loginError} />}
          </>
        )}
      </div>
    </>
  )
}
