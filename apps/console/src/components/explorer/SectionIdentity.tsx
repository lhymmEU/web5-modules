import { FileText, CheckCircle, AlertTriangle, Key, Globe, Link, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import { StepHeader } from '@/components/ui/step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { concepts } from '@/content/concepts'
import type { RepoInfo } from 'pds_module/logic'

interface Props {
  repoInfo: RepoInfo | null
  loading: boolean
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [value])

  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={copy}>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  )
}

export function SectionIdentity({ repoInfo, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <StepHeader step={2} title={concepts.explorer.sections.identity.title} icon={FileText} />
          <div className="ml-10 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!repoInfo) return null

  const { handle, did, didDoc, handleIsCorrect } = repoInfo
  const verificationMethods = didDoc?.verificationMethods ?? {}
  const alsoKnownAs = didDoc?.alsoKnownAs ?? []
  const services = didDoc?.services ?? {}

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <StepHeader step={2} title={concepts.explorer.sections.identity.title} icon={FileText} />
        <p className="text-sm text-muted-foreground ml-10">
          {concepts.explorer.sections.identity.description}
        </p>

        <div className="ml-10 space-y-3">
          {/* Handle verification — always visible */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {handleIsCorrect ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Handle Verification
              <Badge variant={handleIsCorrect ? 'secondary' : 'destructive'} className="text-xs">
                {handleIsCorrect ? 'Verified' : 'Mismatch'}
              </Badge>
            </div>
            <div className="grid gap-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0">Handle</span>
                <span className="font-mono break-all flex-1">{handle}</span>
                <CopyButton value={handle} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0">DID</span>
                <span className="font-mono break-all flex-1">{did}</span>
                <CopyButton value={did} />
              </div>
            </div>
          </div>

          {/* Collapsible subsections */}
          <Accordion type="multiple" defaultValue={['verification-methods']}>
            {/* Verification Methods */}
            {Object.keys(verificationMethods).length > 0 && (
              <AccordionItem value="verification-methods" className="border rounded-lg px-4 mb-2">
                <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Verification Methods
                    <Badge variant="secondary" className="text-xs">{Object.keys(verificationMethods).length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    Public keys associated with this identity, used to verify signatures.
                  </p>
                  <div className="space-y-2 pb-1">
                    {Object.entries(verificationMethods).map(([id, key]) => (
                      <div key={id} className="rounded border bg-muted/50 p-2 text-xs space-y-1">
                        <div className="text-muted-foreground">ID: <span className="font-mono">{id}</span></div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono break-all flex-1">{key}</span>
                          <CopyButton value={key} />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Services */}
            {Object.keys(services).length > 0 && (
              <AccordionItem value="services" className="border rounded-lg px-4 mb-2">
                <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Service Endpoints
                    <Badge variant="secondary" className="text-xs">{Object.keys(services).length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    Where this user's data is hosted and how to interact with their services.
                  </p>
                  <div className="space-y-2 pb-1">
                    {Object.entries(services).map(([id, svc]) => (
                      <div key={id} className="rounded border bg-muted/50 p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{svc.type}</Badge>
                          <span className="text-muted-foreground">{id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono break-all flex-1">{svc.endpoint}</span>
                          <CopyButton value={svc.endpoint} />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Also Known As */}
            {alsoKnownAs.length > 0 && (
              <AccordionItem value="also-known-as" className="border rounded-lg px-4 mb-2">
                <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-primary" />
                    Also Known As
                    <Badge variant="secondary" className="text-xs">{alsoKnownAs.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-1">
                    {alsoKnownAs.map((alias) => (
                      <div key={alias} className="flex items-center gap-2">
                        <span className="font-mono text-xs break-all flex-1">{alias}</span>
                        <CopyButton value={alias} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Raw DID Document */}
            <AccordionItem value="raw-doc" className="border rounded-lg px-4">
              <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                Raw DID Document
              </AccordionTrigger>
              <AccordionContent>
                <pre className="whitespace-pre-wrap overflow-auto max-h-60 rounded bg-muted p-2 font-mono text-xs">
                  {JSON.stringify(didDoc, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}
