import { useState, useEffect, useCallback } from 'react'
import { Search, Loader, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import { StepHeader, ResultBlock } from '@/components/ui/step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { concepts } from '@/content/concepts'
import { listRepos, fetchRepoInfo } from 'pds_module/logic'
import type { AsyncStatus } from '@/types'
import type { SearchResult } from '@/components/ExplorerJourney'

interface IdentityRow {
  did: string
  handle: string
  active: boolean
  loading: boolean
}

const PAGE_SIZE = 5

interface Props {
  pdsUrl: string
  setPdsUrl: (url: string) => void
  availablePds: string[]
  selectedDid: string | null
  onSelectIdentity: (did: string, handle: string) => void
  searchStatus: AsyncStatus
  searchError: string
  onSearch: (query: string) => void
  searchResult: SearchResult | null
  onClearSearch: () => void
}

export function SectionLookup({
  pdsUrl, setPdsUrl, availablePds,
  selectedDid, onSelectIdentity,
  searchStatus, searchError, onSearch,
  searchResult, onClearSearch,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const [rows, setRows] = useState<IdentityRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined])
  const [pageIndex, setPageIndex] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const loadPage = useCallback(async (cursor: string | undefined) => {
    setListLoading(true)
    setRows([])
    try {
      const result = await listRepos(pdsUrl, PAGE_SIZE, cursor)
      if (!result || !result.repos.length) {
        setRows([])
        setHasMore(false)
        return
      }

      setHasMore(!!result.cursor)
      if (result.cursor) {
        setCursors(prev => {
          const next = [...prev]
          next[pageIndex + 1] = result.cursor
          return next
        })
      }

      const initial: IdentityRow[] = result.repos.map(r => ({
        did: r.did,
        handle: '',
        active: r.active,
        loading: true,
      }))
      setRows(initial)

      const resolved = await Promise.all(
        result.repos.map(async (r) => {
          try {
            const info = await fetchRepoInfo(r.did, pdsUrl)
            return { did: r.did, handle: info?.handle ?? '', active: r.active, loading: false }
          } catch {
            return { did: r.did, handle: '', active: r.active, loading: false }
          }
        })
      )
      setRows(resolved)
    } catch {
      setRows([])
      setHasMore(false)
    } finally {
      setListLoading(false)
    }
  }, [pdsUrl, pageIndex])

  useEffect(() => {
    setPageIndex(0)
    setCursors([undefined])
    setRows([])
    setHasMore(false)
  }, [pdsUrl])

  useEffect(() => {
    if (!searchResult) {
      loadPage(cursors[pageIndex])
    }
  }, [pageIndex, pdsUrl, searchResult]) // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = () => {
    if (hasMore) setPageIndex(prev => prev + 1)
  }

  const goPrev = () => {
    if (pageIndex > 0) setPageIndex(prev => prev - 1)
  }

  const triggerSearch = () => {
    const q = searchQuery.trim()
    if (q) onSearch(q)
  }

  const handleClear = () => {
    setSearchQuery('')
    onClearSearch()
  }

  const isSearchMode = !!searchResult

  const displayRows: IdentityRow[] = isSearchMode
    ? [{ did: searchResult.did, handle: searchResult.handle, active: true, loading: false }]
    : rows

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <StepHeader step={1} title={concepts.explorer.sections.lookup.title} icon={Search} />
        <p className="text-sm text-muted-foreground ml-10">
          {concepts.explorer.sections.lookup.description}
        </p>

        <div className="ml-10 space-y-4">
          {/* PDS selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">PDS Server</Label>
            <Select value={pdsUrl} onValueChange={setPdsUrl}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a PDS" />
              </SelectTrigger>
              <SelectContent>
                {availablePds.map((url) => (
                  <SelectItem key={url} value={url}>{url}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search box */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Search by Handle or DID</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. alice or did:ckb:..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                className="flex-1"
              />
              <Button onClick={triggerSearch} disabled={searchStatus === 'loading' || !searchQuery.trim()} size="sm">
                {searchStatus === 'loading' ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </Button>
            </div>
            {searchStatus === 'error' && (
              <ResultBlock status="error" result={searchError} />
            )}
          </div>

          {/* Identity table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isSearchMode ? 'Search Result' : 'Identities on this PDS'}
              </span>
              <div className="flex items-center gap-2">
                {isSearchMode && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={handleClear}>
                    <X className="h-3 w-3 mr-1" />
                    Clear search
                  </Button>
                )}
                {!isSearchMode && listLoading && <Loader className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>

            <div className="rounded-lg border divide-y">
              {displayRows.length === 0 && !listLoading && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground italic">
                  No identities found on this PDS
                </div>
              )}
              {displayRows.length === 0 && listLoading && (
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-24 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                    </div>
                    <div className="h-7 w-16 rounded bg-muted animate-pulse" />
                  </div>
                ))
              )}
              {displayRows.map((row) => (
                <div
                  key={row.did}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    selectedDid === row.did ? 'bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {row.loading ? (
                        <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {row.handle || <span className="italic text-muted-foreground">No handle</span>}
                        </span>
                      )}
                      {!row.active && (
                        <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>
                      )}
                      {selectedDid === row.did && (
                        <Badge variant="secondary" className="text-xs shrink-0">Selected</Badge>
                      )}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{row.did}</div>
                  </div>
                  <Button
                    variant={selectedDid === row.did ? 'default' : 'outline'}
                    size="sm"
                    disabled={row.loading}
                    onClick={() => onSelectIdentity(row.did, row.handle)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Detail
                  </Button>
                </div>
              ))}
            </div>

            {/* Pagination — only shown in list mode, not search mode */}
            {!isSearchMode && (displayRows.length > 0 || pageIndex > 0) && (
              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === 0 || listLoading}
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {pageIndex + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasMore || listLoading}
                  onClick={goNext}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
