import { UserPlus, CheckCircle, Loader } from 'lucide-react'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { userInfo } from 'pds_module/logic'
import type { AsyncStatus } from '@/types'

interface Props {
  pdsUrl: string
  pdsUsername: string
  generatedDid: string
  registerStatus: AsyncStatus
  registerError: string
  registeredUserInfo: userInfo | null
  pdsRegistered: boolean
  onRegister: () => void
}

export function StepRegister({
  pdsUrl, pdsUsername, generatedDid,
  registerStatus, registerError, registeredUserInfo,
  pdsRegistered, onRegister,
}: Props) {
  return (
    <>
      <StepHeader step={6} title="Register on PDS" icon={UserPlus} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Now register your DID with the PDS to create your account. Your username and DID are linked together.
      </p>
      <div className="ml-10 space-y-3">
        {pdsRegistered ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Registration Successful!</div>
              <div className="text-xs font-mono">
                <div>Handle: {registeredUserInfo!.handle}</div>
                <div className="break-all">DID: {registeredUserInfo!.did}</div>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">PDS: </span>
                <Badge variant="secondary" className="text-xs">{pdsUrl}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Username: </span>
                <Badge variant="secondary" className="text-xs">{pdsUsername}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">DID: </span>
                <Badge variant="secondary" className="text-xs font-mono">{generatedDid.slice(0, 20)}...</Badge>
              </div>
            </div>
            <Button onClick={onRegister} disabled={registerStatus === 'loading'}>
              {registerStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Register Account
            </Button>
            {registerStatus === 'error' && <ResultBlock status="error" result={registerError} />}
          </>
        )}
      </div>
    </>
  )
}
