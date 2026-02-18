import { ConceptCard } from '@/components/learn/ConceptCard'
import { concepts } from '@/content/concepts'
import { KeyManager } from '@/components/KeyManager'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'

export function KeysPage() {
  return (
    <div className="space-y-6">
      <ConceptCard {...concepts.keys} />
      <div>
        <h2 className="text-lg font-semibold mb-4">Try It</h2>
        <ErrorBoundary>
          <KeyManager />
        </ErrorBoundary>
      </div>
    </div>
  )
}
