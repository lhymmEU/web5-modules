import { Lock, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CHAPTER_IDS, CHAPTER_ICONS, CHAPTERS } from './constants'

export function ChapterCover({
  chapter,
  index,
  status,
  onClick,
}: {
  chapter: typeof CHAPTERS[number]
  index: number
  status: 'locked' | 'unlocked' | 'completed'
  onClick: () => void
}) {
  const Icon = CHAPTER_ICONS[CHAPTER_IDS[index]]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === 'locked'}
      className={cn(
        'relative flex flex-col items-center justify-between rounded-xl border-2 px-4 py-6 w-44 h-full shrink-0 transition-all duration-300 text-center select-none',
        status === 'locked' && 'opacity-40 cursor-not-allowed border-muted bg-muted/30',
        status === 'unlocked' && 'border-primary bg-background shadow-none hover:scale-[1.02] cursor-pointer',
        status === 'completed' && 'border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10',
      )}
    >
      <span className={cn(
        'text-2xl font-bold tracking-wider',
        status === 'locked' ? 'text-muted-foreground/50' : 'text-primary',
      )}>
        {chapter.number}
      </span>

      <div className={cn(
        'flex items-center justify-center w-14 h-14 rounded-full',
        status === 'locked' ? 'bg-muted text-muted-foreground/50' : 'bg-primary/10 text-primary',
      )}>
        {status === 'locked' ? <Lock className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
      </div>

      <div className="space-y-2">
        <h3 className={cn(
          'text-sm font-semibold leading-tight',
          status === 'locked' ? 'text-muted-foreground/60' : 'text-foreground',
        )}>
          {chapter.title}
        </h3>

        {status === 'locked' && (
          <span className="text-[10px] text-muted-foreground">Locked</span>
        )}
        {status === 'unlocked' && (
          <Badge variant="default" className="text-[10px] h-5 px-2 animate-pulse">Begin</Badge>
        )}
        {status === 'completed' && (
          <Badge variant="secondary" className="text-[10px] h-5 px-2 gap-1 text-primary">
            <Check className="h-2.5 w-2.5" /> Complete
          </Badge>
        )}
      </div>
    </button>
  )
}
