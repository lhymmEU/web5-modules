import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { BookOpen } from 'lucide-react'

interface Term {
  term: string
  definition: string
}

interface ConceptCardProps {
  title: string
  subtitle: string
  description: string
  terms: readonly Term[]
}

export function ConceptCard({ title, subtitle, description, terms }: ConceptCardProps) {
  return (
    <Card className="mb-6 border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-primary" />
          <Badge variant="secondary" className="text-xs font-normal">Learn</Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        <Accordion type="single" collapsible>
          <AccordionItem value="terms" className="border-none">
            <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
              Key Terms
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {terms.map(({ term, definition }) => (
                  <div key={term} className="rounded-lg border bg-background p-3">
                    <div className="font-medium text-sm mb-1">{term}</div>
                    <div className="text-xs text-muted-foreground">{definition}</div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
}
