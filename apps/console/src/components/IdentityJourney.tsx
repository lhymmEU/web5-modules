import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Wifi, WifiOff, Loader, Fingerprint, Wallet, Server,
  Hammer, Send, UserPlus, LogIn, Edit2, Save, LogOut,
  Check, CheckCircle, ExternalLink, RefreshCw, FileUp,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import {
  buildCreateTransaction,
  sendCkbTransaction,
} from 'did_module/logic'
import {
  pdsLogin,
  pdsCreateAccount,
  fetchUserProfile,
  writePDS,
  getDidByUsername,
  type RecordType,
  type sessionInfo,
  type userInfo,
  type userProfile as UserProfileType,
} from 'pds_module/logic'
import { KEY_STORE_URL } from 'keystore/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { StepHeader, StepBreadcrumb, ResultBlock } from '@/components/ui/step-flow'
import type { StepMeta } from '@/components/ui/step-flow'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AsyncStatus } from '@/types'

const TOTAL_STEPS = 8

export function IdentityJourney() {
  const { client, connected, didKey: contextDidKey } = useKeystore()
  const signer = ccc.useSigner()
  const { wallet, open: openWallet, address, balance, loading: walletLoading, formatAddress } = useCkbWallet()
  const {
    agent, pdsUrl, setPdsUrl, availablePds,
    username: pdsUsername, setUsername: setPdsUsername,
    resolvedDid: resolvedPdsDid, isResolving, isAvailable,
  } = usePds()

  // Step 1: Keystore connection
  const [pingStatus, setPingStatus] = useState<AsyncStatus>('idle')
  const [pingResult, setPingResult] = useState('')

  // Step 2: DID Key
  const [didKeyStatus, setDidKeyStatus] = useState<AsyncStatus>('idle')
  const [didKeyResult, setDidKeyResult] = useState('')
  const [noKeyYet, setNoKeyYet] = useState(false)

  // Step 4: PDS config (local draft before committing to context)
  const [localUsername, setLocalUsername] = useState(pdsUsername)
  useEffect(() => { setLocalUsername(pdsUsername) }, [pdsUsername])

  // Step 5: Create DID
  const [buildStatus, setBuildStatus] = useState<AsyncStatus>('idle')
  const [rawTx, setRawTx] = useState('')
  const [generatedDid, setGeneratedDid] = useState('')
  const [buildError, setBuildError] = useState('')
  const [sendStatus, setSendStatus] = useState<AsyncStatus>('idle')
  const [txHash, setTxHash] = useState('')
  const [sendError, setSendError] = useState('')

  // Step 6: Register PDS
  const [registerStatus, setRegisterStatus] = useState<AsyncStatus>('idle')
  const [registerError, setRegisterError] = useState('')
  const [registeredUserInfo, setRegisteredUserInfo] = useState<userInfo | null>(null)

  // Step 7: Login
  const [loginStatus, setLoginStatus] = useState<AsyncStatus>('idle')
  const [loginError, setLoginError] = useState('')
  const [session, setSession] = useState<sessionInfo | null>(null)
  const [ckbAddress, setCkbAddress] = useState('')

  // Step 8: Profile
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!signer) { setCkbAddress(''); return }
    signer.getRecommendedAddress().then(setCkbAddress).catch(() => {})
  }, [signer])

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

  // Derive completion states
  const didKeyDone = !!(didKeyResult && didKeyStatus === 'success') || !!contextDidKey
  const effectiveDidKey = didKeyResult || contextDidKey || ''
  const walletDone = !!wallet && !!address
  const pdsConfigDone = !!pdsUsername && isAvailable && !isResolving
  const didCreated = sendStatus === 'success' && !!generatedDid
  const pdsRegistered = registerStatus === 'success' && !!registeredUserInfo
  const loggedIn = loginStatus === 'success' && !!session

  // Carousel navigation
  const [currentStep, setCurrentStep] = useState(0)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollToStep = useCallback((index: number) => {
    setCurrentStep(index)
    cardRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [])

  const stepsMeta: StepMeta[] = useMemo(() => [
    { label: 'Keystore', icon: connected ? Wifi : WifiOff, done: connected },
    { label: 'DID Key', icon: Fingerprint, done: didKeyDone },
    { label: 'Wallet', icon: Wallet, done: walletDone },
    { label: 'PDS', icon: Server, done: pdsConfigDone },
    { label: 'Create DID', icon: Hammer, done: didCreated },
    { label: 'Register', icon: UserPlus, done: pdsRegistered },
    { label: 'Sign In', icon: LogIn, done: loggedIn },
    { label: 'Profile', icon: Edit2, done: loggedIn },
  ], [connected, didKeyDone, walletDone, pdsConfigDone, didCreated, pdsRegistered, loggedIn])

  const metadata = useMemo(() => {
    const handle = pdsUsername && pdsUrl ? `${pdsUsername.toLowerCase()}.${pdsUrl}` : ''
    let endpoint = pdsUrl || ''
    if (endpoint && !endpoint.startsWith('http')) endpoint = `https://${endpoint}`

    return JSON.stringify({
      services: {
        atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint },
      },
      alsoKnownAs: handle ? [`at://${handle}`] : [],
      verificationMethods: { atproto: effectiveDidKey },
    }, null, 2)
  }, [pdsUsername, pdsUrl, effectiveDidKey])

  // -- Handlers --

  const handlePing = async () => {
    if (!client) return
    setPingStatus('loading')
    try {
      const duration = await client.ping()
      setPingResult(`${duration.toFixed(1)}ms`)
      setPingStatus('success')
    } catch (e: unknown) {
      setPingResult(e instanceof Error ? e.message : String(e))
      setPingStatus('error')
    }
  }

  const handleGetDIDKey = async () => {
    if (!client) return
    setDidKeyStatus('loading')
    setNoKeyYet(false)
    try {
      const did = await client.getDIDKey()
      if (did) {
        setDidKeyResult(did)
        setDidKeyStatus('success')
        setNoKeyYet(false)
      } else {
        setNoKeyYet(true)
        setDidKeyStatus('idle')
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('no_active_key') || msg.toLowerCase().includes('no key') || msg.toLowerCase().includes('not created')) {
        setNoKeyYet(true)
        setDidKeyStatus('idle')
      } else {
        setDidKeyResult(msg)
        setDidKeyStatus('error')
      }
    }
  }

  const handleBuildTx = async () => {
    if (!signer) return
    setBuildStatus('loading')
    setBuildError('')
    setRawTx('')
    setGeneratedDid('')
    try {
      const { rawTx: tx, did } = await buildCreateTransaction(signer, metadata)
      setRawTx(tx)
      setGeneratedDid(did)
      setBuildStatus('success')
    } catch (e: unknown) {
      setBuildError(e instanceof Error ? e.message : String(e))
      setBuildStatus('error')
    }
  }

  const handleSendTx = async () => {
    if (!signer || !rawTx) return
    setSendStatus('loading')
    setSendError('')
    setTxHash('')
    try {
      const txObj = JSON.parse(rawTx)
      const hash = await sendCkbTransaction(signer, txObj)
      setTxHash(hash)
      setSendStatus('success')
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : String(e))
      setSendStatus('error')
    }
  }

  const handleRegister = async () => {
    if (!generatedDid || !effectiveDidKey || !pdsUsername || !pdsUrl || !ckbAddress || !agent) {
      setRegisterError('Missing required information. Complete previous steps first.')
      setRegisterStatus('error')
      return
    }
    if (!client) { setRegisterError('Keystore not connected'); setRegisterStatus('error'); return }
    setRegisterStatus('loading')
    setRegisterError('')
    setRegisteredUserInfo(null)
    try {
      const info = await pdsCreateAccount(agent, pdsUrl, pdsUsername, effectiveDidKey, generatedDid, ckbAddress, client)
      if (info) {
        setRegisteredUserInfo(info)
        setRegisterStatus('success')
      } else {
        throw new Error('Registration failed')
      }
    } catch (e: unknown) {
      setRegisterError(e instanceof Error ? e.message : String(e))
      setRegisterStatus('error')
    }
  }

  const handleLogin = async () => {
    if (!pdsUrl || !ckbAddress || !effectiveDidKey || !agent || !client) {
      setLoginError('Missing required connections')
      setLoginStatus('error')
      return
    }
    setLoginStatus('loading')
    setLoginError('')
    setSession(null)
    try {
      let targetDid = ''
      if (pdsUsername) {
        const resolved = await getDidByUsername(pdsUsername, pdsUrl)
        if (resolved && resolved !== '') targetDid = resolved
        else throw new Error(`Could not resolve DID for ${pdsUsername}`)
      }
      const sessionInfo = await pdsLogin(agent, targetDid, effectiveDidKey, ckbAddress, client)
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

  const handleLogout = () => {
    setSession(null)
    setLoginStatus('idle')
  }

  const handleSaveProfile = async () => {
    if (!session || !pdsUrl || !effectiveDidKey || !client || !agent) return
    setSaving(true)
    try {
      const record: RecordType = {
        $type: 'app.actor.profile',
        displayName: editDisplayName,
        description: editDescription,
        handle: session.handle,
      }
      const writeResult = await writePDS(agent, session.accessJwt, effectiveDidKey, client, {
        record, did: session.did, rkey: 'self',
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

  const handleImportCar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session || !pdsUrl) return
    setIsImporting(true)
    try {
      const { importRepoCar } = await import('pds_module/logic')
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

  const handleCommitUsername = () => {
    setPdsUsername(localUsername)
  }

  const stepCards = [
    // Step 1
    <>
      <StepHeader step={1} title="Connect to Your Keystore" icon={connected ? Wifi : WifiOff} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your keystore is a secure, isolated app that holds your private keys. It runs on its own origin so your keys never leave it.
      </p>
      <div className="ml-10">
        {connected ? (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="default" className="gap-1.5">
              <Wifi className="h-3 w-3" /> Connected
            </Badge>
            <Button variant="ghost" size="sm" onClick={handlePing} disabled={pingStatus === 'loading'} className="text-xs h-7">
              {pingStatus === 'loading' ? <Loader className="h-3 w-3 animate-spin" /> : 'Test Connection'}
            </Button>
            {pingStatus === 'success' && <span className="text-xs text-muted-foreground">{pingResult} response time</span>}
            {pingStatus === 'error' && <span className="text-xs text-destructive">{pingResult}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="destructive" className="gap-1.5">
              <WifiOff className="h-3 w-3" /> Disconnected
            </Badge>
            <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-xs h-7">Open Keystore</Button>
            </a>
            <span className="text-xs text-muted-foreground">Open the keystore app, then this page will auto-connect.</span>
          </div>
        )}
      </div>
    </>,
    // Step 2
    <>
      <StepHeader step={2} title="Your DID Key" icon={Fingerprint} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your identity is a DID key derived from your private key. It encodes your public key in a portable format that anyone can use to verify you.
      </p>
      <div className="ml-10">
        {didKeyDone ? (
          <div className="space-y-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-xs text-muted-foreground mb-1">Your DID Key</div>
              <p className="font-mono text-xs break-all select-all">{effectiveDidKey}</p>
            </div>
            <p className="text-xs text-muted-foreground">This is your public identity. Anyone can use it to verify messages you sign.</p>
          </div>
        ) : noKeyYet ? (
          <div className="space-y-3">
            <Alert>
              <Fingerprint className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-1">No key found in your keystore</p>
                <p className="text-xs text-muted-foreground mb-2">
                  You need to create a key in the keystore app first. Open the keystore, click "Create Key", then come back here.
                </p>
              </AlertDescription>
            </Alert>
            <div className="flex items-center gap-2 flex-wrap">
              <a href={KEY_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Open Keystore
                </Button>
              </a>
              <Button onClick={handleGetDIDKey} size="sm" variant="default" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Check Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleGetDIDKey} disabled={!connected || didKeyStatus === 'loading'} size="sm">
              {didKeyStatus === 'loading' && <Loader className="h-3.5 w-3.5 animate-spin" />}
              Reveal My DID Key
            </Button>
            {didKeyStatus === 'error' && <ResultBlock status={didKeyStatus} result={didKeyResult} />}
          </div>
        )}
      </div>
    </>,
    // Step 3
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
    </>,
    // Step 4
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
              onBlur={handleCommitUsername}
              onKeyDown={(e) => e.key === 'Enter' && handleCommitUsername()}
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
    </>,
    // Step 5
    <>
      <StepHeader step={5} title="Create Your DID on CKB" icon={Hammer} />
      <p className="text-sm text-muted-foreground ml-10 mb-3">
        Your DID is anchored on the CKB blockchain with metadata pointing to your PDS. This makes your identity tamper-proof and portable.
      </p>
      <div className="ml-10 space-y-4">
        {didCreated ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2">
            <div className="font-medium text-sm text-primary flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> DID Created
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Your DID</div>
              <div className="font-mono bg-background p-2 rounded border text-xs break-all select-all">{generatedDid}</div>
            </div>
            <div className="text-xs text-muted-foreground font-mono break-all">Tx: {txHash}</div>
          </div>
        ) : (
          <>
            <Accordion type="single" collapsible>
              <AccordionItem value="metadata" className="border rounded-lg px-3">
                <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                  Review DID Metadata (auto-generated from previous steps)
                </AccordionTrigger>
                <AccordionContent>
                  <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-60">{metadata}</pre>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {buildStatus !== 'success' ? (
              <div className="space-y-2">
                <Button onClick={handleBuildTx} disabled={buildStatus === 'loading' || !signer}>
                  {buildStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                  Construct Transaction
                </Button>
                {buildStatus === 'error' && <ResultBlock status="error" result={buildError} />}
              </div>
            ) : (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="font-medium text-sm text-primary">Transaction Ready</div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Generated DID</div>
                  <div className="font-mono bg-background p-2 rounded border text-xs break-all">{generatedDid}</div>
                </div>
                <Button onClick={handleSendTx} disabled={sendStatus === 'loading'}>
                  {sendStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Transaction
                </Button>
                {sendStatus === 'error' && <ResultBlock status="error" result={sendError} />}
              </div>
            )}
          </>
        )}
      </div>
    </>,
    // Step 6
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
            <Button onClick={handleRegister} disabled={registerStatus === 'loading'}>
              {registerStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Register Account
            </Button>
            {registerStatus === 'error' && <ResultBlock status="error" result={registerError} />}
          </>
        )}
      </div>
    </>,
    // Step 7
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs h-7">
              <LogOut className="h-3 w-3" /> Sign Out
            </Button>
          </div>
        ) : (
          <>
            <Button onClick={handleLogin} disabled={loginStatus === 'loading'}>
              {loginStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Sign In
            </Button>
            {loginStatus === 'error' && <ResultBlock status="error" result={loginError} />}
          </>
        )}
      </div>
    </>,
    // Step 8
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
              <Button onClick={handleSaveProfile} disabled={isSaving}>
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
                {(userProfile?.value as Record<string, string> | undefined)?.displayName || session!.handle}
              </div>
              <div className="text-sm text-muted-foreground">@{session!.handle}</div>
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
                <input type="file" className="hidden" accept=".car" onChange={handleImportCar} disabled={isImporting} />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </>,
  ]

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <StepBreadcrumb steps={stepsMeta} currentStep={currentStep} onStepClick={scrollToStep} />

      {/* Carousel navigation buttons + container */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={() => scrollToStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-2 scrollbar-none px-1"
        >
          {stepCards.map((content, i) => (
            <div
              key={i}
              ref={(el) => { cardRefs.current[i] = el }}
              className={cn(
                'snap-center shrink-0 w-[min(100%,600px)] transition-all duration-300',
                i === currentStep
                  ? 'opacity-100 scale-100'
                  : 'opacity-40 scale-95 pointer-events-none',
              )}
              onClick={() => { if (i !== currentStep) scrollToStep(i) }}
            >
              <Card className={cn(
                'transition-shadow duration-300 h-full',
                i === currentStep && 'ring-2 ring-primary shadow-none',
              )}>
                <CardContent className="pt-5 pb-5">
                  {content}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={() => scrollToStep(Math.min(TOTAL_STEPS - 1, currentStep + 1))}
          disabled={currentStep === TOTAL_STEPS - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Step counter for mobile */}
      <div className="flex items-center justify-center gap-4 sm:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentStep + 1} / {TOTAL_STEPS}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scrollToStep(Math.min(TOTAL_STEPS - 1, currentStep + 1))}
          disabled={currentStep === TOTAL_STEPS - 1}
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Takeaways */}
      <div className="rounded-lg border bg-muted/30 p-5">
        <h3 className="text-sm font-semibold mb-3">What You're Building</h3>
        <ul className="space-y-2">
          {[
            'A self-owned identity, with no passwords and no central authority.',
            'A DID anchored on the CKB blockchain -- tamper-proof and portable.',
            'A personal data server where your data lives under your control.',
            'All connected: keys sign transactions, DIDs anchor identity, PDS stores data.',
          ].map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
