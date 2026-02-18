import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { AVAILABLE_PDS } from 'pds_module/constants'
import { checkUsernameFormat, getDidByUsername } from 'pds_module/logic'
import type { AtpAgent as AtpAgentType } from 'web5-api'

interface PdsContextType {
  agent: AtpAgentType | null
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
  const [agent, setAgent] = useState<AtpAgentType | null>(null)

  useEffect(() => {
    localStorage.setItem('web5_console_pds_url', pdsUrl)
    localStorage.setItem('web5_console_username', username)
    
    if (username && pdsUrl) {
      setIsResolving(true)
      if (!checkUsernameFormat(username)) {
        setIsAvailable(false)
        setResolvedDid('')
        setIsResolving(false)
        return
      } else {
        setIsAvailable(true)
      }
      getDidByUsername(username, pdsUrl).then((did: string | null) => {
        setResolvedDid(did || '')
        setIsResolving(false)
      }).catch(() => {
        setResolvedDid('')
        setIsResolving(false)
      })
    } else {
      setResolvedDid('')
    }

    let cancelled = false
    ;(async () => {
      try {
        const serviceUrl = pdsUrl.startsWith('http') ? pdsUrl : `https://${pdsUrl}`
        const mod: Record<string, unknown> = await import('web5-api')
        const Ctor = typeof mod.AtpAgent === 'function'
          ? (mod.AtpAgent as new (opts: { service: string }) => AtpAgentType)
          : typeof mod.default === 'function'
            ? (mod.default as new (opts: { service: string }) => AtpAgentType)
            : null
        if (!Ctor) {
          throw new TypeError('web5-api exports do not include AtpAgent constructor')
        }
        const newAgent = new Ctor({ service: serviceUrl })
        if (!cancelled) setAgent(newAgent)
      } catch {
        if (!cancelled) setAgent(null)
      }
    })()
    return () => { cancelled = true }
  }, [pdsUrl, username])

  return (
    <PdsContext.Provider value={{ 
      agent, pdsUrl, setPdsUrl, availablePds: AVAILABLE_PDS,
      username, setUsername, resolvedDid, isResolving, isAvailable
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
