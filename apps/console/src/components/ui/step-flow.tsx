import { ArrowDown, Check, AlertCircle, Loader, ChevronRight } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import type { AsyncStatus } from '@/types'

export function StepHeader({ step, title, icon: Icon }: { step: number; title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-bold text-primary">
        {step}
      </span>
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-base font-semibold">{title}</h3>
    </div>
  )
}

export function FlowArrow() {
  return (
    <div className="flex justify-center py-1 text-muted-foreground/40">
      <ArrowDown className="h-5 w-5" />
    </div>
  )
}

export function ResultBlock({ status, result, className }: { status: AsyncStatus; result: string; className?: string }) {
  if (status === 'idle') return null
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground italic py-2">
        <Loader className="h-3.5 w-3.5 animate-spin" />
        Processing...
      </div>
    )
  }
  const ok = status === 'success'
  return (
    <Alert variant={ok ? 'default' : 'destructive'} className={`break-all ${className ?? ''}`}>
      {ok ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      <AlertDescription className="font-mono text-xs">{result}</AlertDescription>
    </Alert>
  )
}

export interface StepMeta {
  label: string
  icon: React.ElementType
  done: boolean
}

export function StepBreadcrumb({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepMeta[]
  currentStep: number
  onStepClick: (index: number) => void
}) {
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center shrink-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 mx-0.5" />}
          <button
            type="button"
            onClick={() => onStepClick(i)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              i === currentStep
                ? 'bg-primary text-primary-foreground shadow-sm'
                : step.done
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {step.done && i !== currentStep ? (
              <Check className="h-3 w-3" />
            ) : (
              <step.icon className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{step.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        </div>
      ))}
    </nav>
  )
}
