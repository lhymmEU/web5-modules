import { useState, useCallback } from 'react'
import type { AsyncStatus } from '@/types'

interface AsyncAction<T> {
  execute: (...args: unknown[]) => Promise<T | undefined>
  status: AsyncStatus
  result: T | null
  error: string | null
  reset: () => void
}

export function useAsyncAction<T>(
  action: (...args: any[]) => Promise<T>
): AsyncAction<T> {
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (...args: unknown[]) => {
    setStatus('loading')
    setError(null)
    try {
      const res = await action(...args)
      setResult(res)
      setStatus('success')
      return res
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
      return undefined
    }
  }, [action])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { execute, status, result, error, reset }
}
