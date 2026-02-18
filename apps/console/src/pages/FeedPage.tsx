import { ConceptCard } from '@/components/learn/ConceptCard'
import { concepts } from '@/content/concepts'
import { Relayer } from '@/components/Relayer'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

export function FeedPage() {
  return (
    <div className="space-y-6">
      <ConceptCard {...concepts.feed} />
      <div>
        <h2 className="text-lg font-semibold mb-4">Try It</h2>
        <ErrorBoundary>
          <Relayer />
        </ErrorBoundary>
      </div>
    </div>
  )
}
