import { ConceptCard } from '@/components/learn/ConceptCard'
import { concepts } from '@/content/concepts'
import { PdsManager } from '@/components/PdsManager'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

export function PdsPage() {
  return (
    <div className="space-y-6">
      <ConceptCard {...concepts.pds} />
      <div>
        <h2 className="text-lg font-semibold mb-4">Try It</h2>
        <ErrorBoundary>
          <PdsManager />
        </ErrorBoundary>
      </div>
    </div>
  )
}
