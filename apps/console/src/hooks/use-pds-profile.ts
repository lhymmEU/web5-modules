import { useState, useEffect, useCallback } from 'react'
import {
  fetchUserProfile,
  writePDS,
  importRepoCar,
  type RecordType,
  type userProfile as UserProfileType,
} from 'pds_module/logic'
import type { AtpAgent } from 'web5-api'
import type { KeystoreClient } from 'keystore/KeystoreClient'
import { toast } from 'sonner'

interface ProfileDeps {
  did: string | undefined
  pdsUrl: string
}

export function usePdsProfile({ did, pdsUrl }: ProfileDeps) {
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setSaving] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (did && pdsUrl) {
      fetchUserProfile(did, pdsUrl).then((profile) => {
        if (profile) {
          setUserProfile(profile)
          setEditDisplayName((profile.value as Record<string, string>).displayName || '')
          setEditDescription((profile.value as Record<string, string>).description || '')
        }
      })
    } else {
      setUserProfile(null)
    }
  }, [did, pdsUrl])

  const handleSaveProfile = useCallback(async (opts: {
    agent: AtpAgent
    accessJwt: string
    didKey: string
    client: KeystoreClient
    did: string
    handle: string
  }) => {
    setSaving(true)
    try {
      const record: RecordType = {
        $type: 'app.actor.profile',
        displayName: editDisplayName,
        description: editDescription,
        handle: opts.handle,
      }
      const writeResult = await writePDS(opts.agent, opts.accessJwt, opts.didKey, opts.client, {
        record, did: opts.did, rkey: 'self',
        type: userProfile ? 'update' : 'create',
      })
      if (writeResult) {
        const profile = await fetchUserProfile(opts.did, pdsUrl)
        if (profile) setUserProfile(profile)
        setIsEditing(false)
        toast.success('Profile saved')
      }
    } catch (e: unknown) {
      toast.error('Failed to save profile: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }, [editDisplayName, editDescription, userProfile, pdsUrl])

  const handleImportCar = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    sessionDid: string,
    accessJwt: string,
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await importRepoCar(sessionDid, pdsUrl, arrayBuffer, accessJwt)
      if (result) {
        toast.success('CAR file imported successfully!')
        const profile = await fetchUserProfile(sessionDid, pdsUrl)
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
  }, [pdsUrl])

  return {
    userProfile,
    isEditing,
    setIsEditing,
    editDisplayName,
    setEditDisplayName,
    editDescription,
    setEditDescription,
    isSaving,
    isImporting,
    handleSaveProfile,
    handleImportCar,
  }
}
