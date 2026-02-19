import { useState, useCallback } from 'react'
import { pdsCreateAccount, type userInfo } from 'pds_module/logic'
import type { AtpAgent } from 'web5-api'
import type { KeystoreClient } from 'keystore/KeystoreClient'
import type { AsyncStatus } from '@/types'

export function usePdsRegistration() {
  const [registerStatus, setRegisterStatus] = useState<AsyncStatus>('idle')
  const [registerError, setRegisterError] = useState('')
  const [registeredUserInfo, setRegisteredUserInfo] = useState<userInfo | null>(null)

  const handleRegister = useCallback(async (opts: {
    agent: AtpAgent
    pdsUrl: string
    username: string
    didKey: string
    did: string
    ckbAddress: string
    client: KeystoreClient
  }) => {
    const { agent, pdsUrl, username, didKey, did, ckbAddress, client } = opts
    if (!did || !didKey || !username || !pdsUrl || !ckbAddress) {
      setRegisterError('Missing required information. Complete previous steps first.')
      setRegisterStatus('error')
      return
    }
    setRegisterStatus('loading')
    setRegisterError('')
    setRegisteredUserInfo(null)
    try {
      const info = await pdsCreateAccount(agent, pdsUrl, username, didKey, did, ckbAddress, client)
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
  }, [])

  const reset = useCallback(() => {
    setRegisterStatus('idle')
    setRegisterError('')
    setRegisteredUserInfo(null)
  }, [])

  return {
    registerStatus,
    registerError,
    registeredUserInfo,
    pdsRegistered: registerStatus === 'success' && !!registeredUserInfo,
    handleRegister,
    reset,
  }
}
