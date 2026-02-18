import { useState } from 'react'
import { Search, Download, Loader, AlertTriangle } from 'lucide-react'
import { usePds } from '@/contexts/PdsContext'
import { getDidByUsername, fetchRepoRecords, exportRepoCar, fetchRepoInfo } from 'pds_module/logic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { RecordEntry } from '@/types'

export function PdsBrowser() {
  const { pdsUrl } = usePds()
  const [handle, setHandle] = useState('')
  const [did, setDid] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [records, setRecords] = useState<Record<string, RecordEntry[]>>({})
  const [collections, setCollections] = useState<string[]>([])

  const handleBrowse = async () => {
    if (!handle || !pdsUrl) return
    setLoading(true)
    setError('')
    setRecords({})
    setCollections([])
    try {
      let targetDid = handle
      if (!handle.startsWith('did:')) {
        const resolved = await getDidByUsername(handle, pdsUrl)
        if (!resolved) throw new Error('Could not resolve handle to DID')
        targetDid = resolved
      }
      setDid(targetDid)

      const repoInfo = await fetchRepoInfo(targetDid, pdsUrl)
      if (!repoInfo || !repoInfo.collections) throw new Error('Could not fetch repo info or collections')

      const dynamicCollections = repoInfo.collections as string[]
      setCollections(dynamicCollections)

      const results: Record<string, RecordEntry[]> = {}
      for (const colId of dynamicCollections) {
        const data = await fetchRepoRecords(targetDid, colId, pdsUrl, 50)
        if (data && data.records) {
          results[colId] = data.records as RecordEntry[]
        }
      }
      setRecords(results)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to browse PDS')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!did || !pdsUrl) return
    setDownloading(true)
    try {
      const data = await exportRepoCar(did, pdsUrl)
      if (data) {
        const blob = new Blob([data], { type: 'application/vnd.ipld.car' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${handle || did}.car`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (e: unknown) {
      toast.error('Failed to download CAR file: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter username (e.g. alice) or DID"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
              className="flex-1"
            />
            <Button onClick={handleBrowse} disabled={loading || !handle}>
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Browse
            </Button>
            {did && (
              <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                {downloading ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                CAR
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {did && (
            <div className="rounded-md bg-muted p-2 text-xs font-mono break-all">
              DID: {did}
            </div>
          )}
        </CardContent>
      </Card>

      {collections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Collections</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple">
              {collections.map(colId => (
                <AccordionItem key={colId} value={colId}>
                  <AccordionTrigger className="text-sm">
                    <div className="flex items-center gap-2">
                      {colId}
                      <Badge variant="secondary" className="text-xs">{records[colId]?.length || 0}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {records[colId]?.length > 0 ? (
                        records[colId].map((record, idx) => (
                          <div key={idx} className="rounded border bg-muted/50 p-2 text-xs">
                            <div className="text-muted-foreground mb-1 break-all">URI: {record.uri}</div>
                            <pre className="whitespace-pre-wrap overflow-auto max-h-40 text-xs">
                              {JSON.stringify(record.value, null, 2)}
                            </pre>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic p-2">No records found</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
