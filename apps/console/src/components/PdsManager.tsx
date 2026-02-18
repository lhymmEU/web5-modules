import { useState, useEffect } from 'react'
import { Loader, LogIn, LogOut, Shield, Edit2, Save, X, UserPlus, CheckCircle, Trash2, FileUp } from 'lucide-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { ccc } from '@ckb-ccc/connector-react'
import {
  pdsLogin,
  fetchUserProfile,
  writePDS,
  type RecordType,
  type sessionInfo,
  getDidByUsername,
  pdsCreateAccount,
  type userInfo,
  pdsDeleteAccount,
  importRepoCar,
  type userProfile as UserProfileType,
} from 'pds_module/logic'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

export function PdsManager() {
  const { wallet } = ccc.useCcc()
  const signer = ccc.useSigner()
  const { connected, didKey, client } = useKeystore()
  const { agent, pdsUrl, username: pdsUsername } = usePds()

  const [address, setAddress] = useState('')

  // Registration
  const [registerDid, setRegisterDid] = useState('')
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [registerError, setRegisterError] = useState('')
  const [registeredUserInfo, setRegisteredUserInfo] = useState<userInfo | null>(null)

  // Deletion
  const [deleteUsername, setDeleteUsername] = useState('')
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; did: string }>({ open: false, did: '' })

  // Login
  const [username, setUsername] = useState('')
  const [did, setDid] = useState('')
  const [loginStatus, setLoginStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle')
  const [loginError, setLoginError] = useState('')
  const [session, setSession] = useState<sessionInfo | null>(null)

  // Profile
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (session?.did && pdsUrl) {
      fetchUserProfile(session.did, pdsUrl).then((profile) => {
        if (profile) {
          setUserProfile(profile)
          setEditDisplayName((profile.value as Record<string, string>).displayName || '')
          setEditDescription((profile.value as Record<string, string>).description || '')
        }
      })
    } else {
      setUserProfile(null)
    }
  }, [session, pdsUrl])

  const handleSaveProfile = async () => {
    if (!session || !pdsUrl || !didKey || !client || !agent) return
    setSaving(true)
    try {
      const record: RecordType = {
        $type: 'app.actor.profile',
        displayName: editDisplayName,
        description: editDescription,
        handle: session.handle,
      }
      const writeResult = await writePDS(agent, session.accessJwt, didKey, client, {
        record,
        did: session.did,
        rkey: 'self',
        type: userProfile ? 'update' : 'create',
      })
      if (writeResult) {
        const profile = await fetchUserProfile(session.did, pdsUrl)
        if (profile) setUserProfile(profile)
        setIsEditing(false)
        toast.success('Profile saved')
      }
    } catch (e: unknown) {
      toast.error('Failed to save profile: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!signer) {
      setAddress('')
      return
    }
    ;(async () => {
      try {
        const addr = await signer.getRecommendedAddress()
        setAddress(addr)
      } catch {
        // failed to get address
      }
    })()
  }, [signer])

  const handleLogin = async () => {
    if ((!did && !username) || !pdsUrl || !address || !didKey || !agent) {
      setLoginError('Missing required info (Username/DID, PDS URL, CKB Address, DID Key, or Agent)')
      setLoginStatus('error')
      return
    }
    if (!client) {
      setLoginError('Keystore client not connected')
      setLoginStatus('error')
      return
    }
    setLoginStatus('processing')
    setLoginError('')
    setSession(null)
    try {
      let targetDid = did
      if (!targetDid && username) {
        const resolved = await getDidByUsername(username, pdsUrl)
        if (resolved && resolved !== '') {
          targetDid = resolved
          setDid(resolved)
        } else {
          throw new Error(`Could not resolve DID for ${username}`)
        }
      }
      const sessionInfo = await pdsLogin(agent, targetDid, didKey, address, client)
      if (sessionInfo) {
        setSession(sessionInfo)
        setLoginStatus('success')
      } else {
        throw new Error('Login failed')
      }
    } catch (e: unknown) {
      setLoginError(e instanceof Error ? e.message : String(e))
      setLoginStatus('error')
    }
  }

  const handleRegisterPds = async () => {
    if (!registerDid || !didKey || !pdsUsername || !pdsUrl || !address || !agent) {
      setRegisterError('Missing required information (DID, DID Key, Username, PDS Address, CKB Address, or Agent)')
      setRegisterStatus('error')
      return
    }
    setRegisterStatus('processing')
    setRegisterError('')
    setRegisteredUserInfo(null)
    try {
      if (!client) throw new Error('Keystore client not connected')
      const userInfo = await pdsCreateAccount(agent, pdsUrl, pdsUsername, didKey, registerDid, address, client)
      if (userInfo) {
        setRegisteredUserInfo(userInfo)
        setRegisterStatus('success')
      } else {
        throw new Error('Failed to create PDS account')
      }
    } catch (e: unknown) {
      setRegisterError(e instanceof Error ? e.message : String(e))
      setRegisterStatus('error')
    }
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
    setDeleteStatus('processing')
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

  const handleLogout = () => {
    setSession(null)
    setLoginStatus('idle')
  }

  const handleImportCar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session || !pdsUrl) return
    setIsImporting(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await importRepoCar(session.did, pdsUrl, arrayBuffer, session.accessJwt)
      if (result) {
        toast.success('CAR file imported successfully!')
        const profile = await fetchUserProfile(session.did, pdsUrl)
        if (profile) setUserProfile(profile)
      } else {
        throw new Error('Failed to import CAR file')
      }
    } catch (e: unknown) {
      toast.error('Failed to import CAR: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setIsImporting(false)
      event.target.value = ''
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

  if (session) {
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
            {isEditing ? (
              <div className="max-w-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Edit Profile</h3>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Display Name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Bio / Description" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">
                    {(userProfile?.value as Record<string, string> | undefined)?.displayName || session?.handle}
                  </div>
                  <div className="text-sm text-muted-foreground">@{session?.handle}</div>
                  {(userProfile?.value as Record<string, string> | undefined)?.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {(userProfile!.value as Record<string, string>).description}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" /> Edit Profile
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" /> Sign Out
                  </Button>
                  <label className={`inline-flex items-center gap-2 cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Button variant="outline" asChild>
                      <span>
                        {isImporting ? <Loader className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                        Import CAR
                      </span>
                    </Button>
                    <input type="file" className="hidden" accept=".car" onChange={handleImportCar} disabled={isImporting} />
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
                      try {
                        return JSON.stringify(JSON.parse(session.didMetadata), null, 2)
                      } catch {
                        return session.didMetadata
                      }
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

              <Button onClick={handleRegisterPds} disabled={registerStatus === 'processing' || !registerDid || !didKey}>
                {registerStatus === 'processing' ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Register
              </Button>

              {registerStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              )}

              {registerStatus === 'success' && registeredUserInfo && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Registration Successful!</div>
                    <div className="text-xs font-mono">
                      <div>Handle: {registeredUserInfo.handle}</div>
                      <div className="break-all">DID: {registeredUserInfo.did}</div>
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

              <Button onClick={handleLogin} disabled={loginStatus === 'processing'}>
                {loginStatus === 'processing' ? <Loader className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </Button>

              {loginStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>Login failed: {loginError}</AlertDescription>
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

              <Button variant="destructive" onClick={initiateDelete} disabled={deleteStatus === 'processing' || !deleteUsername || !didKey}>
                {deleteStatus === 'processing' ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
