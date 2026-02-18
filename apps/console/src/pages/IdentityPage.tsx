import { IdentityJourney } from '@/components/IdentityJourney'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { concepts } from '@/content/concepts'

const allTerms = [
  ...concepts.keys.terms,
  ...concepts.dids.terms,
  ...concepts.pds.terms,
]

export function IdentityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Build Your Identity</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Walk through each step to create your self-sovereign Web5 identity -- from cryptographic keys to on-chain DID to personal data storage.
        </p>
      </div>

      <ErrorBoundary>
        <IdentityJourney />
      </ErrorBoundary>

      <Accordion type="single" collapsible>
        <AccordionItem value="terms" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Key Terms Glossary
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-2 pb-2">
              {allTerms.map(({ term, definition }) => (
                <div key={term} className="rounded-lg border bg-background p-3">
                  <div className="font-medium text-sm mb-1">{term}</div>
                  <div className="text-xs text-muted-foreground">{definition}</div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
