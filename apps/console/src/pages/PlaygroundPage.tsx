import { useState, useCallback } from 'react'
import {
  Check, ChevronLeft, ChevronRight, ArrowLeft, Trophy,
} from 'lucide-react'
import { useCarousel } from '@/hooks/use-carousel'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { concepts } from '@/content/concepts'
import { cn } from '@/lib/utils'
import type { ChapterId, SignData, DidOps } from './playground/types'
import { CHAPTERS, CHAPTER_IDS, CHAPTER_ICONS } from './playground/constants'
import { Chapter1Sign } from './playground/Chapter1Sign'
import { Chapter2Verify } from './playground/Chapter2Verify'
import { Chapter3CreateDid } from './playground/Chapter3CreateDid'
import { Chapter4ManageDids } from './playground/Chapter4ManageDids'
import { ChapterCover } from './playground/ChapterCover'

export function PlaygroundPage() {
  const [activeChapter, setActiveChapter] = useState<ChapterId | null>(null)
  const [completedChapters, setCompletedChapters] = useState<Set<ChapterId>>(new Set())
  const [signData, setSignData] = useState<SignData | null>(null)
  const [didOps, setDidOps] = useState<DidOps>({ updateKey: false, updateHandle: false, transfer: false, destroy: false })

  const carousel = useCarousel(CHAPTER_IDS.length)

  const completeChapter = useCallback((id: ChapterId) => {
    setCompletedChapters((prev) => new Set(prev).add(id))
  }, [])

  const chapterStatus = useCallback((id: ChapterId): 'locked' | 'unlocked' | 'completed' => {
    if (completedChapters.has(id)) return 'completed'
    const idx = CHAPTER_IDS.indexOf(id)
    if (idx === 0) return 'unlocked'
    const prev = CHAPTER_IDS[idx - 1]
    return completedChapters.has(prev) ? 'unlocked' : 'locked'
  }, [completedChapters])

  const handleDidOp = useCallback((op: keyof DidOps) => {
    setDidOps((prev) => {
      const next = { ...prev, [op]: true }
      if (next.updateKey && next.updateHandle && next.transfer && next.destroy) {
        completeChapter('manage-did')
      }
      return next
    })
  }, [completeChapter])

  const completedCount = completedChapters.size
  const nextChapter = activeChapter ? CHAPTER_IDS[CHAPTER_IDS.indexOf(activeChapter) + 1] as ChapterId | undefined : undefined

  // Chapter Detail View
  if (activeChapter) {
    const chapterIdx = CHAPTER_IDS.indexOf(activeChapter)
    const chapter = CHAPTERS[chapterIdx]
    const Icon = CHAPTER_ICONS[activeChapter]
    const isComplete = completedChapters.has(activeChapter)

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveChapter(null)} className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>Chapter {chapter.number}</span>
              {isComplete && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-1 text-primary">
                  <Check className="h-2.5 w-2.5" /> Complete
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary shrink-0" />
              {chapter.title}
            </h1>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{chapter.narrative}&rdquo;</p>
        </div>

        <ErrorBoundary>
          {activeChapter === 'sign' && (
            <Chapter1Sign onComplete={(data) => { setSignData(data); completeChapter('sign') }} />
          )}
          {activeChapter === 'verify' && (
            <Chapter2Verify signData={signData} onComplete={() => completeChapter('verify')} />
          )}
          {activeChapter === 'create-did' && (
            <Chapter3CreateDid onComplete={() => completeChapter('create-did')} />
          )}
          {activeChapter === 'manage-did' && (
            <Chapter4ManageDids ops={didOps} onOp={handleDidOp} />
          )}
        </ErrorBoundary>

        {isComplete && (
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Trophy className="h-5 w-5" />
              Chapter Complete!
            </div>
            <p className="text-sm text-muted-foreground">{chapter.completion}</p>
            <div className="flex gap-2">
              {nextChapter && chapterStatus(nextChapter) !== 'locked' && (
                <Button onClick={() => setActiveChapter(nextChapter)}>
                  Continue to Chapter {CHAPTERS[CHAPTER_IDS.indexOf(nextChapter)].number}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setActiveChapter(null)}>
                Back to Chapters
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Chapter Select View
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">{concepts.playground.title}</h1>
        <p className="text-sm text-muted-foreground max-w-xl">{concepts.playground.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Quest Progress</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(completedCount / CHAPTER_IDS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums">{completedCount}/{CHAPTER_IDS.length}</span>
      </div>

      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={carousel.prev}
          disabled={carousel.isFirst}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div
          ref={carousel.scrollRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth py-4 scrollbar-none px-1 justify-center sm:justify-start"
        >
          {CHAPTERS.map((chapter, i) => {
            const id = CHAPTER_IDS[i]
            const status = chapterStatus(id)
            return (
              <div
                key={id}
                ref={carousel.setCardRef(i)}
                className={cn(
                  'snap-center transition-all duration-300',
                  i === carousel.currentIndex ? 'scale-100 opacity-100' : 'scale-95 opacity-60',
                )}
                onClick={() => carousel.setCurrentIndex(i)}
              >
                <ChapterCover
                  chapter={chapter}
                  index={i}
                  status={status}
                  onClick={() => {
                    if (status !== 'locked') setActiveChapter(id)
                  }}
                />
              </div>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background hidden sm:flex"
          onClick={carousel.next}
          disabled={carousel.isLast}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 sm:hidden">
        <Button variant="ghost" size="sm" onClick={carousel.prev} disabled={carousel.isFirst}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="text-sm text-muted-foreground">{carousel.currentIndex + 1} / {CHAPTER_IDS.length}</span>
        <Button variant="ghost" size="sm" onClick={carousel.next} disabled={carousel.isLast}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {completedCount === CHAPTER_IDS.length && (
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-2">
          <Trophy className="h-8 w-8 text-primary mx-auto" />
          <h3 className="text-lg font-bold">Quest Complete!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You've mastered the building blocks of self-sovereign identity — from cryptographic signatures to on-chain DIDs to full sovereignty over your digital self.
          </p>
        </div>
      )}
    </div>
  )
}
