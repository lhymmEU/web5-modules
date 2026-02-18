import { ConceptCard } from '@/components/learn/ConceptCard'
import { concepts } from '@/content/concepts'
import { DidManager } from '@/components/DidManager'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

export function DidsPage() {
  return (
    <div className="space-y-6">
      <ConceptCard {...concepts.dids} />
      <div>
        <h2 className="text-lg font-semibold mb-4">Try It</h2>
        <ErrorBoundary>
          <DidManager />
        </ErrorBoundary>
      </div>
    </div>
  )
}
