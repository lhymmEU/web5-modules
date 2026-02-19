import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { AVAILABLE_PDS } from 'pds_module/constants'
import { checkUsernameFormat, getDidByUsername } from 'pds_module/logic'
import { AtpAgent } from 'web5-api'

interface PdsContextType {
  agent: AtpAgent | null
  pdsUrl: string
  setPdsUrl: (url: string) => void
  availablePds: string[]
  username: string
  setUsername: (username: string) => void
  resolvedDid: string
  isResolving: boolean
  isAvailable: boolean
}

const PdsContext = createContext<PdsContextType | null>(null)

export function PdsProvider({ children }: { children: ReactNode }) {
  const [pdsUrl, setPdsUrl] = useState<string>(() => {
    return localStorage.getItem('web5_console_pds_url') || AVAILABLE_PDS[0]
  })

  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('web5_console_username') || ''
  })

  const [resolvedDid, setResolvedDid] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('web5_console_pds_url', pdsUrl)
  }, [pdsUrl])

  useEffect(() => {
    localStorage.setItem('web5_console_username', username)
  }, [username])

  // Resolve username availability
  useEffect(() => {
    if (!username || !pdsUrl) {
      setResolvedDid('')
      return
    }

    setIsResolving(true)
    if (!checkUsernameFormat(username)) {
      setIsAvailable(false)
      setResolvedDid('')
      setIsResolving(false)
      return
    }

    setIsAvailable(true)
    let cancelled = false
    getDidByUsername(username, pdsUrl)
      .then((did: string | null) => {
        if (!cancelled) {
          setResolvedDid(did || '')
          setIsResolving(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedDid('')
          setIsResolving(false)
        }
      })
    return () => { cancelled = true }
  }, [pdsUrl, username])

  // Create agent when pdsUrl changes
  const agent = useMemo(() => {
    try {
      const serviceUrl = pdsUrl.startsWith('http') ? pdsUrl : `https://${pdsUrl}`
      return new AtpAgent({ service: serviceUrl })
    } catch {
      return null
    }
  }, [pdsUrl])

  return (
    <PdsContext.Provider value={{
      agent, pdsUrl, setPdsUrl, availablePds: AVAILABLE_PDS,
      username, setUsername, resolvedDid, isResolving, isAvailable,
    }}>
      {children}
    </PdsContext.Provider>
  )
}

export function usePds() {
  const context = useContext(PdsContext)
  if (!context) {
    throw new Error('usePds must be used within a PdsProvider')
  }
  return context
}
