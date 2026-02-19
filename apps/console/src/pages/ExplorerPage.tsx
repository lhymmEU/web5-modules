import { ExplorerJourney } from '@/components/ExplorerJourney'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { concepts } from '@/content/concepts'

export function ExplorerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">{concepts.explorer.title}</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          {concepts.explorer.subtitle}
        </p>
      </div>

      <ErrorBoundary>
        <ExplorerJourney />
      </ErrorBoundary>

      <Accordion type="single" collapsible>
        <AccordionItem value="terms" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Key Terms Glossary
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-3 sm:grid-cols-2 pb-2">
              {concepts.explorer.terms.map(({ term, definition }) => (
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
