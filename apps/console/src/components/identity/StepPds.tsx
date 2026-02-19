import { Server, Loader, CheckCircle } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  pdsUrl: string
  setPdsUrl: (url: string) => void
  availablePds: string[]
  localUsername: string
  setLocalUsername: (name: string) => void
  pdsUsername: string
  isResolving: boolean
  isAvailable: boolean
  resolvedPdsDid: string
  onCommitUsername: () => void
}

export function StepPds({
  pdsUrl, setPdsUrl, availablePds,
  localUsername, setLocalUsername, pdsUsername,
  isResolving, isAvailable, resolvedPdsDid,
  onCommitUsername,
}: Props) {
  return (
    <>
      <StepHeader step={4} title="Choose Your PDS & Username" icon={Server} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        A Personal Data Server (PDS) stores your data. Pick a server and choose your username -- this becomes part of your on-chain identity.
      </p>
      <div className="ml-10 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">PDS Server</Label>
          <Select value={pdsUrl} onValueChange={setPdsUrl}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a PDS" />
            </SelectTrigger>
            <SelectContent>
              {availablePds.map((url) => (
                <SelectItem key={url} value={url}>{url}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-medium">Username</Label>
          <div className="flex gap-2">
            <Input
              placeholder="alice"
              value={localUsername}
              onChange={(e) => setLocalUsername(e.target.value)}
              className="flex-1"
              onBlur={onCommitUsername}
              onKeyDown={(e) => e.key === 'Enter' && onCommitUsername()}
            />
          </div>
          {localUsername && pdsUrl && (
            <div className="text-xs">
              {localUsername !== pdsUsername ? (
                <span className="text-muted-foreground italic">Press Enter or click away to check availability</span>
              ) : isResolving ? (
                <span className="text-muted-foreground flex items-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" /> Checking availability...
                </span>
              ) : !isAvailable ? (
                <ul className="text-destructive space-y-0.5 list-disc list-inside">
                  <li>4 to 18 characters long</li>
                  <li>Starts with a letter</li>
                  <li>Only letters, numbers, and hyphens</li>
                  <li>Ends with a letter or number</li>
                </ul>
              ) : resolvedPdsDid ? (
                <span className="text-amber-600">Username already taken</span>
              ) : (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> Available -- your handle will be <span className="font-mono">{pdsUsername.toLowerCase()}.{pdsUrl}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
