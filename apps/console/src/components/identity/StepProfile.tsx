import { Edit2, Loader, Save, FileUp } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { userProfile as UserProfileType } from 'pds_module/logic'

interface Props {
  loggedIn: boolean
  handle: string
  userProfile: UserProfileType | null
  isEditing: boolean
  setIsEditing: (v: boolean) => void
  editDisplayName: string
  setEditDisplayName: (v: string) => void
  editDescription: string
  setEditDescription: (v: string) => void
  isSaving: boolean
  isImporting: boolean
  onSaveProfile: () => void
  onImportCar: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function StepProfile({
  loggedIn, handle, userProfile,
  isEditing, setIsEditing,
  editDisplayName, setEditDisplayName,
  editDescription, setEditDescription,
  isSaving, isImporting,
  onSaveProfile, onImportCar,
}: Props) {
  return (
    <>
      <StepHeader step={8} title="Set Up Your Profile" icon={Edit2} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Personalize your profile by setting a display name and description. This is your first record on the AT Protocol.
      </p>
      <div className="ml-10">
        {isEditing ? (
          <div className="max-w-sm space-y-3">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display Name" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Bio / Description" />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
            </div>
          </div>
        ) : loggedIn ? (
          <div className="space-y-3">
            <div>
              <div className="text-lg font-bold">
                {(userProfile?.value as Record<string, string> | undefined)?.displayName || handle}
              </div>
              <div className="text-sm text-muted-foreground">@{handle}</div>
              {(userProfile?.value as Record<string, string> | undefined)?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {(userProfile!.value as Record<string, string>).description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit2 className="h-3.5 w-3.5" /> Edit Profile
              </Button>
              <label className={`inline-flex items-center gap-2 cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                <Button variant="outline" size="sm" asChild>
                  <span>
                    {isImporting ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                    Import CAR
                  </span>
                </Button>
                <input type="file" className="hidden" accept=".car" onChange={onImportCar} disabled={isImporting} />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
