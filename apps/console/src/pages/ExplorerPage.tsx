import { ConceptCard } from '@/components/learn/ConceptCard'
import { concepts } from '@/content/concepts'
import { PdsBrowser } from '@/components/PdsBrowser'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

export function ExplorerPage() {
  return (
    <div className="space-y-6">
      <ConceptCard {...concepts.explorer} />
      <div>
        <h2 className="text-lg font-semibold mb-4">Try It</h2>
        <ErrorBoundary>
          <PdsBrowser />
        </ErrorBoundary>
      </div>
    </div>
  )
}
