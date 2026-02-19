import { useState, useEffect, useMemo } from 'react'
import {
  Wifi, WifiOff, Fingerprint, Wallet, Server,
  Hammer, UserPlus, LogIn, Edit2,
  Check, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { ccc } from '@ckb-ccc/connector-react'
import { useKeystore } from '@/contexts/KeystoreContext'
import { usePds } from '@/contexts/PdsContext'
import { useCkbWallet } from '@/hooks/use-ckb-wallet'
import { useDidCreate } from '@/hooks/use-did-create'
import { usePdsRegistration } from '@/hooks/use-pds-registration'
import { usePdsSession } from '@/hooks/use-pds-session'
import { usePdsProfile } from '@/hooks/use-pds-profile'
import { useCarousel } from '@/hooks/use-carousel'
import { buildDidMetadata } from '@/lib/did-metadata'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StepBreadcrumb } from '@/components/ui/step-flow'
import type { StepMeta } from '@/components/ui/step-flow'
import { cn } from '@/lib/utils'
import type { AsyncStatus } from '@/types'

import { StepKeystore } from './identity/StepKeystore'
import { StepDidKey } from './identity/StepDidKey'
import { StepWallet } from './identity/StepWallet'
import { StepPds } from './identity/StepPds'
import { StepCreateDid } from './identity/StepCreateDid'
import { StepRegister } from './identity/StepRegister'
import { StepSignIn } from './identity/StepSignIn'
import { StepProfile } from './identity/StepProfile'

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

  // Step 1: Keystore
  const [pingStatus, setPingStatus] = useState<AsyncStatus>('idle')
  const [pingResult, setPingResult] = useState('')

  // Step 2: DID Key
  const [didKeyStatus, setDidKeyStatus] = useState<AsyncStatus>('idle')
  const [didKeyResult, setDidKeyResult] = useState('')
  const [noKeyYet, setNoKeyYet] = useState(false)

  // Step 4: local username draft
  const [localUsername, setLocalUsername] = useState(pdsUsername)
  useEffect(() => { setLocalUsername(pdsUsername) }, [pdsUsername])

  // Step 5: Create DID
  const didCreate = useDidCreate()

  // Step 6: Registration
  const registration = usePdsRegistration()

  // Step 7: Login
  const pdsSession = usePdsSession()

  // CKB address
  const [ckbAddress, setCkbAddress] = useState('')
  useEffect(() => {
    if (!signer) { setCkbAddress(''); return }
    signer.getRecommendedAddress().then(setCkbAddress).catch(() => {})
  }, [signer])

  // Step 8: Profile
  const profile = usePdsProfile({
    did: pdsSession.session?.did,
    pdsUrl,
  })

  // Derived states
  const didKeyDone = !!(didKeyResult && didKeyStatus === 'success') || !!contextDidKey
  const effectiveDidKey = didKeyResult || contextDidKey || ''
  const walletDone = !!wallet && !!address
  const pdsConfigDone = !!pdsUsername && isAvailable && !isResolving

  const metadata = useMemo(
    () => buildDidMetadata(pdsUrl, pdsUsername, effectiveDidKey),
    [pdsUsername, pdsUrl, effectiveDidKey],
  )

  const carousel = useCarousel(TOTAL_STEPS)

  const stepsMeta: StepMeta[] = useMemo(() => [
    { label: 'Keystore', icon: connected ? Wifi : WifiOff, done: connected },
    { label: 'DID Key', icon: Fingerprint, done: didKeyDone },
    { label: 'Wallet', icon: Wallet, done: walletDone },
    { label: 'PDS', icon: Server, done: pdsConfigDone },
    { label: 'Create DID', icon: Hammer, done: didCreate.didCreated },
    { label: 'Register', icon: UserPlus, done: registration.pdsRegistered },
    { label: 'Sign In', icon: LogIn, done: pdsSession.loggedIn },
    { label: 'Profile', icon: Edit2, done: pdsSession.loggedIn },
  ], [connected, didKeyDone, walletDone, pdsConfigDone, didCreate.didCreated, registration.pdsRegistered, pdsSession.loggedIn])

  // Handlers
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

  const handleRegister = () => {
    if (!agent || !client) return
    registration.handleRegister({
      agent, pdsUrl, username: pdsUsername,
      didKey: effectiveDidKey, did: didCreate.generatedDid,
      ckbAddress, client,
    })
  }

  const handleLogin = () => {
    if (!agent || !client) return
    pdsSession.handleLogin({
      agent, pdsUrl, didKey: effectiveDidKey,
      ckbAddress, client, username: pdsUsername,
    })
  }

  const handleSaveProfile = () => {
    if (!agent || !client || !pdsSession.session) return
    profile.handleSaveProfile({
      agent, accessJwt: pdsSession.session.accessJwt,
      didKey: effectiveDidKey, client,
      did: pdsSession.session.did, handle: pdsSession.session.handle,
    })
  }

  const handleImportCar = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!pdsSession.session) return
    profile.handleImportCar(event, pdsSession.session.did, pdsSession.session.accessJwt)
  }

  const stepCards = [
    <StepKeystore
      connected={connected}
      pingStatus={pingStatus}
      pingResult={pingResult}
      onPing={handlePing}
    />,
    <StepDidKey
      connected={connected}
      didKeyDone={didKeyDone}
      effectiveDidKey={effectiveDidKey}
      noKeyYet={noKeyYet}
      didKeyStatus={didKeyStatus}
      didKeyResult={didKeyResult}
      onGetDIDKey={handleGetDIDKey}
    />,
    <StepWallet
      walletDone={walletDone}
      address={address}
      balance={balance}
      walletLoading={walletLoading}
      formatAddress={formatAddress}
      openWallet={openWallet}
    />,
    <StepPds
      pdsUrl={pdsUrl}
      setPdsUrl={setPdsUrl}
      availablePds={availablePds}
      localUsername={localUsername}
      setLocalUsername={setLocalUsername}
      pdsUsername={pdsUsername}
      isResolving={isResolving}
      isAvailable={isAvailable}
      resolvedPdsDid={resolvedPdsDid}
      onCommitUsername={() => setPdsUsername(localUsername)}
    />,
    <StepCreateDid
      metadata={metadata}
      didCreated={didCreate.didCreated}
      generatedDid={didCreate.generatedDid}
      txHash={didCreate.txHash}
      buildStatus={didCreate.buildStatus}
      buildError={didCreate.buildError}
      sendStatus={didCreate.sendStatus}
      sendError={didCreate.sendError}
      canBuild={!!signer}
      onBuild={() => didCreate.handleBuildTx(signer, metadata)}
      onSend={() => didCreate.handleSendTx(signer)}
    />,
    <StepRegister
      pdsUrl={pdsUrl}
      pdsUsername={pdsUsername}
      generatedDid={didCreate.generatedDid}
      registerStatus={registration.registerStatus}
      registerError={registration.registerError}
      registeredUserInfo={registration.registeredUserInfo}
      pdsRegistered={registration.pdsRegistered}
      onRegister={handleRegister}
    />,
    <StepSignIn
      loginStatus={pdsSession.loginStatus}
      loginError={pdsSession.loginError}
      session={pdsSession.session}
      loggedIn={pdsSession.loggedIn}
      onLogin={handleLogin}
      onLogout={pdsSession.handleLogout}
    />,
    <StepProfile
      loggedIn={pdsSession.loggedIn}
      handle={pdsSession.session?.handle || ''}
      userProfile={profile.userProfile}
      isEditing={profile.isEditing}
      setIsEditing={profile.setIsEditing}
      editDisplayName={profile.editDisplayName}
      setEditDisplayName={profile.setEditDisplayName}
      editDescription={profile.editDescription}
      setEditDescription={profile.setEditDescription}
      isSaving={profile.isSaving}
      isImporting={profile.isImporting}
      onSaveProfile={handleSaveProfile}
      onImportCar={handleImportCar}
    />,
  ]

  return (
    <div className="space-y-4">
      <StepBreadcrumb steps={stepsMeta} currentStep={carousel.currentIndex} onStepClick={carousel.scrollTo} />

      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={carousel.prev}
          disabled={carousel.isFirst}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={carousel.scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-2 scrollbar-none px-1"
        >
          {stepCards.map((content, i) => (
            <div
              key={i}
              ref={carousel.setCardRef(i)}
              className={cn(
                'snap-center shrink-0 w-[min(100%,600px)] transition-all duration-300',
                i === carousel.currentIndex
                  ? 'opacity-100 scale-100'
                  : 'opacity-40 scale-95 pointer-events-none',
              )}
              onClick={() => { if (i !== carousel.currentIndex) carousel.scrollTo(i) }}
            >
              <Card className={cn(
                'transition-shadow duration-300 h-full',
                i === carousel.currentIndex && 'ring-2 ring-primary shadow-none',
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
          onClick={carousel.next}
          disabled={carousel.isLast}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 sm:hidden">
        <Button variant="ghost" size="sm" onClick={carousel.prev} disabled={carousel.isFirst}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          {carousel.currentIndex + 1} / {TOTAL_STEPS}
        </span>
        <Button variant="ghost" size="sm" onClick={carousel.next} disabled={carousel.isLast}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

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
