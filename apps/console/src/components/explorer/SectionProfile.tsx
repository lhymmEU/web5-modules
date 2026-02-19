import { User } from 'lucide-react'
import { StepHeader } from '@/components/ui/step-flow'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { concepts } from '@/content/concepts'
import type { userProfile } from 'pds_module/logic'

interface Props {
  profile: userProfile | null
  loading: boolean
}

export function SectionProfile({ profile, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <StepHeader step={3} title={concepts.explorer.sections.profile.title} icon={User} />
          <div className="ml-10 space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const displayName = profile ? (profile.value?.displayName as string) || '' : ''
  const description = profile ? (profile.value?.description as string) || '' : ''

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <StepHeader step={3} title={concepts.explorer.sections.profile.title} icon={User} />
        <p className="text-sm text-muted-foreground ml-10">
          {concepts.explorer.sections.profile.description}
        </p>

        <div className="ml-10 space-y-3">
          {!profile ? (
            <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
              No profile record found for this identity.
            </div>
          ) : (
            <>
              <div className="rounded-lg border p-4 space-y-2">
                {displayName ? (
                  <div className="text-lg font-semibold">{displayName}</div>
                ) : (
                  <div className="text-sm italic text-muted-foreground">No display name set</div>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Badge variant="outline" className="text-xs font-mono">app.actor.profile</Badge>
                  <Badge variant="outline" className="text-xs font-mono">rkey: self</Badge>
                </div>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="raw" className="border rounded-lg px-3">
                  <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                    Raw Record
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1 text-xs">
                      <div className="text-muted-foreground break-all">URI: {profile.uri}</div>
                      <div className="text-muted-foreground break-all">CID: {profile.cid}</div>
                      <pre className="whitespace-pre-wrap overflow-auto max-h-40 mt-2 rounded bg-muted p-2 font-mono text-xs">
                        {JSON.stringify(profile.value, null, 2)}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
