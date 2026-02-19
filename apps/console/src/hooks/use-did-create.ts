import { useState, useCallback } from 'react'
import { buildCreateTransaction, sendCkbTransaction } from 'did_module/logic'
import type { AsyncStatus } from '@/types'

interface DidCreateState {
  buildStatus: AsyncStatus
  rawTx: string
  generatedDid: string
  buildError: string
  sendStatus: AsyncStatus
  txHash: string
  sendError: string
  didCreated: boolean
}

export function useDidCreate() {
  const [buildStatus, setBuildStatus] = useState<AsyncStatus>('idle')
  const [rawTx, setRawTx] = useState('')
  const [generatedDid, setGeneratedDid] = useState('')
  const [buildError, setBuildError] = useState('')
  const [sendStatus, setSendStatus] = useState<AsyncStatus>('idle')
  const [txHash, setTxHash] = useState('')
  const [sendError, setSendError] = useState('')

  const handleBuildTx = useCallback(async (signer: any, metadata: string) => {
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
  }, [])

  const handleSendTx = useCallback(async (signer: any) => {
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
  }, [rawTx])

  const reset = useCallback(() => {
    setBuildStatus('idle')
    setRawTx('')
    setGeneratedDid('')
    setBuildError('')
    setSendStatus('idle')
    setTxHash('')
    setSendError('')
  }, [])

  const state: DidCreateState = {
    buildStatus,
    rawTx,
    generatedDid,
    buildError,
    sendStatus,
    txHash,
    sendError,
    didCreated: sendStatus === 'success' && !!generatedDid,
  }

  return { ...state, handleBuildTx, handleSendTx, reset }
}
