import { useState } from 'react'
import { Package, Download, Loader, Hash } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { concepts } from '@/content/concepts'
import { exportRepoCar } from 'pds_module/logic'
import { toast } from 'sonner'

interface Props {
  did: string
  handle: string
  pdsUrl: string
  blobs: string[]
  blobsLoading: boolean
  blobsCursor?: string
  onLoadMoreBlobs: () => void
  blobsLoadingMore: boolean
}

export function SectionPortability({
  did, handle, pdsUrl,
  blobs, blobsLoading, blobsCursor, onLoadMoreBlobs, blobsLoadingMore,
}: Props) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
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
        toast.success('Repository exported successfully')
      }
    } catch (e: unknown) {
      toast.error('Export failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setDownloading(false)
    }
  }

  if (blobsLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <StepHeader step={5} title={concepts.explorer.sections.portability.title} icon={Package} />
          <div className="ml-10 space-y-3">
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
        <StepHeader step={5} title={concepts.explorer.sections.portability.title} icon={Package} />
        <p className="text-sm text-muted-foreground ml-10">
          {concepts.explorer.sections.portability.description}
        </p>

        <div className="ml-10 space-y-4">
          {/* Export */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Export Repository</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Download the entire repository as a portable CAR file.
                </p>
              </div>
              <Button onClick={handleDownload} disabled={downloading} variant="outline" size="sm">
                {downloading ? <Loader className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                Download CAR
              </Button>
            </div>
          </div>

          {/* Blobs */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Blobs</span>
              <Badge variant="secondary" className="text-xs">{blobs.length}{blobsCursor ? '+' : ''}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Content-addressed binary data (images, files) stored in this repository.
            </p>
            {blobs.length > 0 ? (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {blobs.map((cid) => (
                  <div key={cid} className="rounded bg-muted/50 p-2 font-mono text-xs break-all">
                    {cid}
                  </div>
                ))}
                {blobsCursor && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    disabled={blobsLoadingMore}
                    onClick={onLoadMoreBlobs}
                  >
                    {blobsLoadingMore ? <Loader className="h-3.5 w-3.5 animate-spin mr-2" /> : null}
                    Load More
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No blobs in this repository</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
