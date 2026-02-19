import { useState, useCallback } from 'react'
import { Database, Loader } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { concepts } from '@/content/concepts'
import { fetchRepoRecords } from 'pds_module/logic'
import type { RecordEntry } from '@/types'

interface Props {
  did: string
  pdsUrl: string
  collections: string[]
  loading: boolean
}

const PAGE_SIZE = 20

export function SectionRepository({ did, pdsUrl, collections, loading }: Props) {
  const [records, setRecords] = useState<Record<string, RecordEntry[]>>({})
  const [cursors, setCursors] = useState<Record<string, string | undefined>>({})
  const [loadingCol, setLoadingCol] = useState<string | null>(null)

  const loadCollection = useCallback(async (colId: string, cursor?: string) => {
    setLoadingCol(colId)
    try {
      const data = await fetchRepoRecords(did, colId, pdsUrl, PAGE_SIZE, cursor)
      if (data) {
        setRecords(prev => ({
          ...prev,
          [colId]: cursor ? [...(prev[colId] || []), ...(data.records as RecordEntry[])] : (data.records as RecordEntry[]),
        }))
        setCursors(prev => ({ ...prev, [colId]: data.cursor }))
      }
    } finally {
      setLoadingCol(null)
    }
  }, [did, pdsUrl])

  const handleOpenCollection = (values: string[]) => {
    for (const colId of values) {
      if (!records[colId]) {
        loadCollection(colId)
      }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <StepHeader step={4} title={concepts.explorer.sections.repository.title} icon={Database} />
          <div className="ml-10 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <StepHeader step={4} title={concepts.explorer.sections.repository.title} icon={Database} />
        <p className="text-sm text-muted-foreground ml-10">
          {concepts.explorer.sections.repository.description}
        </p>

        {!collections.length ? (
          <div className="ml-10 text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
            No collections found in this repository.
          </div>
        ) : (
        <div className="ml-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">Collections</span>
            <Badge variant="secondary" className="text-xs">{collections.length}</Badge>
          </div>

          <Accordion type="multiple" onValueChange={handleOpenCollection}>
            {collections.map(colId => (
              <AccordionItem key={colId} value={colId}>
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{colId}</span>
                    {records[colId] && (
                      <Badge variant="secondary" className="text-xs">{records[colId].length}{cursors[colId] ? '+' : ''}</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {loadingCol === colId && !records[colId] ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                      Loading records...
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {records[colId]?.length ? (
                        <>
                          {records[colId].map((record, idx) => (
                            <div key={idx} className="rounded border bg-muted/50 p-3 text-xs space-y-1">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Badge variant="outline" className="text-xs font-mono shrink-0">AT URI</Badge>
                                <span className="break-all">{record.uri}</span>
                              </div>
                              {record.cid && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Badge variant="outline" className="text-xs font-mono shrink-0">CID</Badge>
                                  <span className="font-mono break-all">{record.cid}</span>
                                </div>
                              )}
                              <pre className="whitespace-pre-wrap overflow-auto max-h-40 mt-1 rounded bg-background p-2 font-mono text-xs">
                                {JSON.stringify(record.value, null, 2)}
                              </pre>
                            </div>
                          ))}
                          {cursors[colId] && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={loadingCol === colId}
                              onClick={() => loadCollection(colId, cursors[colId])}
                            >
                              {loadingCol === colId ? <Loader className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                              Load More
                            </Button>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic py-2">No records in this collection</p>
                      )}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        )}
      </CardContent>
    </Card>
  )
}
