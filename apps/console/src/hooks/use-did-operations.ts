import { useState, useCallback } from 'react'
import {
  fetchDidCkbCellsInfo,
  type didCkbCellInfo,
  transferDidCell,
  updateHandle,
  destroyDidCell,
  updateDidKey,
} from 'did_module/logic'
import { getDidByUsername } from 'pds_module/logic'
import { toast } from 'sonner'

interface DestroyDialog {
  open: boolean
  args: string
  message: string
}

export function useDidOperations() {
  const [didList, setDidList] = useState<didCkbCellInfo[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [destroyDialog, setDestroyDialog] = useState<DestroyDialog>({
    open: false, args: '', message: '',
  })

  const handleFetchList = useCallback(async (signer: any) => {
    if (!signer) return
    setLoadingList(true)
    setDidList([])
    try {
      const list = await fetchDidCkbCellsInfo(signer)
      setDidList(list)
    } catch {
      toast.error('Failed to fetch DID list')
    } finally {
      setLoadingList(false)
    }
  }, [])

  const handleTransfer = useCallback(async (signer: any, didArgs: string, receiver: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await transferDidCell(signer, didArgs, receiver)
      if (hash) {
        toast.success(`Transfer successful! Tx: ${hash}`)
        handleFetchList(signer)
      } else {
        toast.error('Transfer failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Transfer failed')
    } finally {
      setProcessingId(null)
    }
  }, [handleFetchList])

  const handleDestroy = useCallback(async (signer: any, didArgs: string) => {
    if (!signer) return
    const didItem = didList.find((item) => item.args === didArgs)
    let warningMessage = 'Are you sure you want to destroy this DID? This action cannot be undone.'

    if (didItem) {
      try {
        const meta = JSON.parse(didItem.didMetadata)
        if (meta.alsoKnownAs?.[0]?.startsWith('at://')) {
          const handle = meta.alsoKnownAs[0].replace('at://', '')
          const parts = handle.split('.')
          if (parts.length >= 3) {
            const username = parts[0]
            const pds = parts.slice(1).join('.')
            setProcessingId(didArgs)
            try {
              const did = await getDidByUsername(username, pds)
              if (did !== '') {
                warningMessage = `The handle "${handle}" may still be in use (registered on PDS). It is recommended to delete the PDS account first. Destroy anyway?`
              }
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
    setDestroyDialog({ open: true, args: didArgs, message: warningMessage })
  }, [didList])

  const confirmDestroy = useCallback(async (signer: any) => {
    if (!signer) return
    const didArgs = destroyDialog.args
    setDestroyDialog({ open: false, args: '', message: '' })
    setProcessingId(didArgs)
    try {
      const hash = await destroyDidCell(signer, didArgs)
      if (hash) {
        toast.success(`Destroy successful! Tx: ${hash}`)
        handleFetchList(signer)
      } else {
        toast.error('Destroy failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Destroy failed')
    } finally {
      setProcessingId(null)
    }
  }, [destroyDialog.args, handleFetchList])

  const handleUpdateKey = useCallback(async (signer: any, didArgs: string, newKey: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateDidKey(signer, didArgs, newKey)
      if (hash) {
        toast.success(`Update Key successful! Tx: ${hash}`)
        handleFetchList(signer)
      } else {
        toast.error('Update Key failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update Key failed')
    } finally {
      setProcessingId(null)
    }
  }, [handleFetchList])

  const handleUpdateHandle = useCallback(async (signer: any, didArgs: string, newHandle: string) => {
    if (!signer) return
    setProcessingId(didArgs)
    try {
      const hash = await updateHandle(signer, didArgs, newHandle)
      if (hash) {
        toast.success(`Update Handle successful! Tx: ${hash}`)
        handleFetchList(signer)
      } else {
        toast.error('Update Handle failed')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Update Handle failed')
    } finally {
      setProcessingId(null)
    }
  }, [handleFetchList])

  const closeDestroyDialog = useCallback(() => {
    setDestroyDialog({ open: false, args: '', message: '' })
  }, [])

  return {
    didList,
    loadingList,
    processingId,
    destroyDialog,
    handleFetchList,
    handleTransfer,
    handleDestroy,
    confirmDestroy,
    handleUpdateKey,
    handleUpdateHandle,
    closeDestroyDialog,
  }
}
