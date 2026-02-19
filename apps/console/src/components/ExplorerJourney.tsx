import { useState, useCallback } from 'react'
import { usePds } from '@/contexts/PdsContext'
import { getDidByUsername, fetchRepoInfo, fetchUserProfile, fetchRepoBlobs } from 'pds_module/logic'
import { SectionLookup } from '@/components/explorer/SectionLookup'
import { SectionIdentity } from '@/components/explorer/SectionIdentity'
import { SectionProfile } from '@/components/explorer/SectionProfile'
import { SectionRepository } from '@/components/explorer/SectionRepository'
import { SectionPortability } from '@/components/explorer/SectionPortability'
import { FlowArrow } from '@/components/ui/step-flow'
import type { AsyncStatus } from '@/types'
import type { RepoInfo, userProfile } from 'pds_module/logic'

export interface SearchResult {
  did: string
  handle: string
}

export function ExplorerJourney() {
  const { pdsUrl, setPdsUrl, availablePds, resolvedDid: ownDid, username: ownUsername } = usePds()

  const [selectedDid, setSelectedDid] = useState<string | null>(null)
  const [selectedHandle, setSelectedHandle] = useState('')

  const [searchStatus, setSearchStatus] = useState<AsyncStatus>('idle')
  const [searchError, setSearchError] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)

  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null)
  const [repoLoading, setRepoLoading] = useState(false)

  const [profile, setProfile] = useState<userProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const [blobs, setBlobs] = useState<string[]>([])
  const [blobsCursor, setBlobsCursor] = useState<string | undefined>()
  const [blobsLoading, setBlobsLoading] = useState(false)
  const [blobsLoadingMore, setBlobsLoadingMore] = useState(false)

  const ownFullHandle = ownUsername ? `${ownUsername.toLowerCase()}.${pdsUrl}` : ''
  const isOwned = !!(selectedDid && (
    (ownDid && selectedDid === ownDid) ||
    (ownFullHandle && repoInfo?.handle === ownFullHandle)
  ))

  const resetDetails = useCallback(() => {
    setRepoInfo(null)
    setProfile(null)
    setBlobs([])
    setBlobsCursor(undefined)
  }, [])

  const loadDetails = useCallback(async (did: string) => {
    setRepoLoading(true)
    setProfileLoading(true)
    setBlobsLoading(true)

    const infoPromise = fetchRepoInfo(did, pdsUrl)
      .then(info => { setRepoInfo(info); return info })
      .catch(() => { setRepoInfo(null); return null })
      .finally(() => setRepoLoading(false))

    fetchUserProfile(did, pdsUrl)
      .then(p => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false))

    fetchRepoBlobs(did, pdsUrl, 20)
      .then(b => {
        setBlobs(b?.cids ?? [])
        setBlobsCursor(b?.cursor)
      })
      .catch(() => { setBlobs([]); setBlobsCursor(undefined) })
      .finally(() => setBlobsLoading(false))

    await infoPromise
  }, [pdsUrl])

  const handleSelectIdentity = useCallback((did: string, handle: string) => {
    resetDetails()
    setSelectedDid(did)
    setSelectedHandle(handle)
    setSearchStatus('idle')
    setSearchError('')
    loadDetails(did)
  }, [resetDetails, loadDetails])

  const handleSearch = useCallback(async (query: string) => {
    setSearchStatus('loading')
    setSearchError('')
    setSearchResult(null)
    try {
      let did = query
      let handle = ''
      if (!query.startsWith('did:')) {
        const resolved = await getDidByUsername(query, pdsUrl)
        if (!resolved) {
          setSearchStatus('error')
          setSearchError('Could not resolve handle to DID. Check the handle and PDS server.')
          return
        }
        did = resolved
        handle = query
      }

      const info = await fetchRepoInfo(did, pdsUrl)
      const resolvedHandle = handle || info?.handle || ''

      setSearchResult({ did, handle: resolvedHandle })
      setSearchStatus('success')
      handleSelectIdentity(did, resolvedHandle)
    } catch (e: unknown) {
      setSearchStatus('error')
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    }
  }, [pdsUrl, handleSelectIdentity])

  const handleClearSearch = useCallback(() => {
    setSearchResult(null)
    setSearchStatus('idle')
    setSearchError('')
  }, [])

  const handleLoadMoreBlobs = useCallback(async () => {
    if (!blobsCursor || !selectedDid) return
    setBlobsLoadingMore(true)
    try {
      const b = await fetchRepoBlobs(selectedDid, pdsUrl, 20, blobsCursor)
      if (b) {
        setBlobs(prev => [...prev, ...b.cids])
        setBlobsCursor(b.cursor)
      }
    } catch {
      // silently fail
    } finally {
      setBlobsLoadingMore(false)
    }
  }, [selectedDid, pdsUrl, blobsCursor])

  const collections = repoInfo?.collections ?? []

  return (
    <div className="space-y-2">
      <SectionLookup
        pdsUrl={pdsUrl}
        setPdsUrl={setPdsUrl}
        availablePds={availablePds}
        selectedDid={selectedDid}
        onSelectIdentity={handleSelectIdentity}
        searchStatus={searchStatus}
        searchError={searchError}
        onSearch={handleSearch}
        searchResult={searchResult}
        onClearSearch={handleClearSearch}
      />

      {selectedDid && (
        <>
          <FlowArrow />
          <SectionIdentity repoInfo={repoInfo} loading={repoLoading} />

          <FlowArrow />
          <SectionProfile profile={profile} loading={profileLoading} />

          <FlowArrow />
          <SectionRepository
            did={selectedDid}
            pdsUrl={pdsUrl}
            collections={collections}
            loading={repoLoading}
          />

          {isOwned && (
            <>
              <FlowArrow />
              <SectionPortability
                did={selectedDid}
                handle={selectedHandle}
                pdsUrl={pdsUrl}
                blobs={blobs}
                blobsLoading={blobsLoading}
                blobsCursor={blobsCursor}
                onLoadMoreBlobs={handleLoadMoreBlobs}
                blobsLoadingMore={blobsLoadingMore}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
