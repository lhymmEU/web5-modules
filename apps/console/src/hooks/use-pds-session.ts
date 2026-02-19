import { useState, useCallback } from 'react'
import {
  pdsLogin,
  getDidByUsername,
  type sessionInfo,
} from 'pds_module/logic'
import type { AtpAgent } from 'web5-api'
import type { KeystoreClient } from 'keystore/KeystoreClient'
import type { AsyncStatus } from '@/types'

export function usePdsSession() {
  const [loginStatus, setLoginStatus] = useState<AsyncStatus>('idle')
  const [loginError, setLoginError] = useState('')
  const [session, setSession] = useState<sessionInfo | null>(null)

  const handleLogin = useCallback(async (opts: {
    agent: AtpAgent
    pdsUrl: string
    didKey: string
    ckbAddress: string
    client: KeystoreClient
    username?: string
    did?: string
  }) => {
    const { agent, pdsUrl, didKey, ckbAddress, client, username, did } = opts
    setLoginStatus('loading')
    setLoginError('')
    setSession(null)
    try {
      let targetDid = did || ''
      if (!targetDid && username) {
        const resolved = await getDidByUsername(username, pdsUrl)
        if (resolved && resolved !== '') targetDid = resolved
        else throw new Error(`Could not resolve DID for ${username}`)
      }
      if (!targetDid) throw new Error('No DID specified')
      const sessionInfo = await pdsLogin(agent, targetDid, didKey, ckbAddress, client)
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
  }, [])

  const handleLogout = useCallback(() => {
    setSession(null)
    setLoginStatus('idle')
  }, [])

  return {
    loginStatus,
    loginError,
    session,
    loggedIn: loginStatus === 'success' && !!session,
    handleLogin,
    handleLogout,
  }
}
