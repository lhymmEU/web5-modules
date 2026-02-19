import { useState, useEffect } from 'react'
import { Loader, LogIn, LogOut, Shield, Edit2, Save, X, UserPlus, CheckCircle, Trash2, FileUp } from 'lucide-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { ccc } from '@ckb-ccc/connector-react'
import { pdsDeleteAccount, getDidByUsername } from 'pds_module/logic'
import { usePdsSession } from '@/hooks/use-pds-session'
import { usePdsProfile } from '@/hooks/use-pds-profile'
import { usePdsRegistration } from '@/hooks/use-pds-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { AsyncStatus } from '@/types'

export function PdsManager() {
  const { wallet } = ccc.useCcc()
  const signer = ccc.useSigner()
  const { connected, didKey, client } = useKeystore()
  const { agent, pdsUrl, username: pdsUsername } = usePds()

  const [address, setAddress] = useState('')

  // Registration
  const [registerDid, setRegisterDid] = useState('')
  const registration = usePdsRegistration()

  // Login / Session
  const [username, setUsername] = useState('')
  const pdsSession = usePdsSession()

  // Profile
  const profile = usePdsProfile({
    did: pdsSession.session?.did,
    pdsUrl,
  })

  // Deletion
  const [deleteUsername, setDeleteUsername] = useState('')
  const [deleteStatus, setDeleteStatus] = useState<AsyncStatus>('idle')
  const [deleteError, setDeleteError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; did: string }>({ open: false, did: '' })

  useEffect(() => {
    if (!signer) { setAddress(''); return }
    ;(async () => {
      try {
        const addr = await signer.getRecommendedAddress()
        setAddress(addr)
      } catch { /* ignore */ }
    })()
  }, [signer])

  const handleLogin = () => {
    if (!agent || !client || !didKey) return
    pdsSession.handleLogin({
      agent, pdsUrl, didKey, ckbAddress: address,
      client, username,
    })
  }

  const handleRegisterPds = () => {
    if (!agent || !client || !didKey) return
    registration.handleRegister({
      agent, pdsUrl, username: pdsUsername,
      didKey, did: registerDid, ckbAddress: address, client,
    })
  }

  const handleSaveProfile = () => {
    if (!agent || !client || !didKey || !pdsSession.session) return
    profile.handleSaveProfile({
      agent, accessJwt: pdsSession.session.accessJwt,
      didKey, client,
      did: pdsSession.session.did, handle: pdsSession.session.handle,
    })
  }

  const handleImportCar = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!pdsSession.session) return
    profile.handleImportCar(event, pdsSession.session.did, pdsSession.session.accessJwt)
  }

  const initiateDelete = async () => {
    if (!deleteUsername || !signer || !didKey || !pdsUrl || !agent) {
      setDeleteError('Missing required info (Username, Wallet, DID Key, PDS Address, or Agent)')
      setDeleteStatus('error')
      return
    }
    try {
      const resolvedDid = await getDidByUsername(deleteUsername, pdsUrl)
      if (!resolvedDid || resolvedDid === '') {
        throw new Error(`Could not find DID for username "${deleteUsername}" on PDS ${pdsUrl}`)
      }
      setDeleteDialog({ open: true, did: resolvedDid })
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e))
      setDeleteStatus('error')
    }
  }

  const confirmDelete = async () => {
    const resolvedDid = deleteDialog.did
    setDeleteDialog({ open: false, did: '' })
    setDeleteStatus('loading')
    setDeleteError('')
    try {
      if (!client) throw new Error('Keystore client not connected')
      if (!signer || !didKey || !agent) throw new Error('Missing required connections')
      const addr = await signer.getRecommendedAddress()
      const success = await pdsDeleteAccount(agent, resolvedDid, addr, didKey, client)
      if (success) {
        setDeleteStatus('success')
        setDeleteUsername('')
        toast.success('PDS Account deleted successfully')
      } else {
        throw new Error('Failed to delete PDS account')
      }
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : String(e))
      setDeleteStatus('error')
    }
  }

  if (!wallet) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Please connect your CKB wallet in the header.
        </CardContent>
      </Card>
    )
  }

  if (!connected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-destructive">
          Keystore disconnected. Please check your connection in the header.
        </CardContent>
      </Card>
    )
  }

  if (pdsSession.session) {
    const session = pdsSession.session
    return (
      <div className="space-y-4">
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, did: '' })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete PDS Account</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the PDS account for "{deleteUsername}" (DID: {deleteDialog.did})? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Card>
          <CardContent className="pt-6">
            {profile.isEditing ? (
              <div className="max-w-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Edit Profile</h3>
                  <Button variant="ghost" size="sm" onClick={() => profile.setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={profile.editDisplayName} onChange={(e) => profile.setEditDisplayName(e.target.value)} placeholder="Display Name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={profile.editDescription} onChange={(e) => profile.setEditDescription(e.target.value)} placeholder="Bio / Description" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={profile.isSaving}>
                    {profile.isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => profile.setIsEditing(false)} disabled={profile.isSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    {(profile.userProfile?.value as Record<string, string> | undefined)?.displayName || session.handle}
                  </div>
                  <div className="text-sm text-muted-foreground">@{session.handle}</div>
                  {(profile.userProfile?.value as Record<string, string> | undefined)?.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {(profile.userProfile!.value as Record<string, string>).description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => profile.setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" /> Edit Profile
                  </Button>
                  <Button variant="outline" onClick={pdsSession.handleLogout}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                  <label className={`inline-flex items-center gap-2 cursor-pointer ${profile.isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Button variant="outline" asChild>
                      <span>
                        {profile.isImporting ? <Loader className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                        Import CAR
                      </span>
                    </Button>
                    <input type="file" className="hidden" accept=".car" onChange={handleImportCar} disabled={profile.isImporting} />
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Session Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple">
              <AccordionItem value="access-jwt">
                <AccordionTrigger className="text-sm">Access JWT</AccordionTrigger>
                <AccordionContent>
                  <div className="font-mono text-xs bg-muted p-2 rounded break-all max-h-40 overflow-auto">
                    {session.accessJwt}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="refresh-jwt">
                <AccordionTrigger className="text-sm">Refresh JWT</AccordionTrigger>
                <AccordionContent>
                  <div className="font-mono text-xs bg-muted p-2 rounded break-all max-h-40 overflow-auto">
                    {session.refreshJwt}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="metadata">
                <AccordionTrigger className="text-sm">DID Metadata</AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60">
                    {(() => {
                      try { return JSON.stringify(JSON.parse(session.didMetadata), null, 2) }
                      catch { return session.didMetadata }
                    })()}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, did: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PDS Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the PDS account for "{deleteUsername}" (DID: {deleteDialog.did})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="register">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="register">Register</TabsTrigger>
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="delete">Delete</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" /> Register PDS Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3 rounded-md border p-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">PDS Address</div>
                  <Badge variant="secondary">{pdsUrl}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Username</div>
                  <Badge variant="secondary">{pdsUsername || 'Not set'}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>DID (Decentralized Identifier)</Label>
                <Input placeholder="did:ckb:..." value={registerDid} onChange={(e) => setRegisterDid(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Enter the DID you created in the DID Manager.
                </p>
              </div>

              <Button onClick={handleRegisterPds} disabled={registration.registerStatus === 'loading' || !registerDid || !didKey}>
                {registration.registerStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Register
              </Button>

              {registration.registerStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{registration.registerError}</AlertDescription>
                </Alert>
              )}

              {registration.pdsRegistered && registration.registeredUserInfo && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Registration Successful!</div>
                    <div className="text-xs font-mono">
                      <div>Handle: {registration.registeredUserInfo.handle}</div>
                      <div className="break-all">DID: {registration.registeredUserInfo.did}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LogIn className="h-4 w-4" /> Login to PDS
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground mb-1">PDS URL</div>
                <Badge variant="secondary">{pdsUrl}</Badge>
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input placeholder="alice" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>

              <Button onClick={handleLogin} disabled={pdsSession.loginStatus === 'loading'}>
                {pdsSession.loginStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </Button>

              {pdsSession.loginStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>Login failed: {pdsSession.loginError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delete" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Delete PDS Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Username to Delete</Label>
                <Input placeholder="alice" value={deleteUsername} onChange={(e) => setDeleteUsername(e.target.value)} />
              </div>

              <Button variant="destructive" onClick={initiateDelete} disabled={deleteStatus === 'loading' || !deleteUsername || !didKey}>
                {deleteStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Account
              </Button>

              {deleteStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}

              {deleteStatus === 'success' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">PDS Account Deleted Successfully!</div>
                    <p className="text-xs">Please proceed to the DIDs page to destroy the corresponding DID Cell on CKB.</p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
