import { useState, useEffect, useRef } from 'react'
import { Loader, Play, Square, Server, Trash2, ChevronDown, ChevronRight, Code, Copy } from 'lucide-react'
import { Firehose, type CommitEvent } from '@skyware/firehose'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { FirehoseEvent } from '@/types'

const MAX_EVENTS = 100

export function Relayer() {
  const [relayerUrl, setRelayerUrl] = useState('relayer.bbsfans.dev')
  const [isConnected, setIsConnected] = useState(false)
  const [events, setEvents] = useState<FirehoseEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({})
  const firehoseRef = useRef<Firehose | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const startFirehose = () => {
    if (firehoseRef.current) return
    try {
      const url = relayerUrl.startsWith('ws') ? relayerUrl : `wss://${relayerUrl}`
      const firehose = new Firehose({ relay: url })

      firehose.on('commit', (message: CommitEvent) => {
        const newEvent: FirehoseEvent = {
          id: Math.random().toString(36).substring(7),
          time: new Date().toLocaleTimeString(),
          repo: message.repo,
          ops: message.ops.map(op => ({
            action: op.action,
            path: op.path,
            uri: `at://${message.repo}/${op.path}`,
            record: (op as unknown as Record<string, unknown>).record,
            cid: (op as unknown as Record<string, unknown>).cid as string | undefined,
          })),
          raw: message,
        }
        setEvents(prev => [newEvent, ...prev].slice(0, MAX_EVENTS))
      })

      firehose.on('open', () => setIsConnected(true))
      firehose.on('close', () => { setIsConnected(false); setIsRunning(false); firehoseRef.current = null })
      firehose.on('error', () => { setIsConnected(false); setIsRunning(false); firehoseRef.current = null })

      firehoseRef.current = firehose
      setIsRunning(true)
      firehose.start()
    } catch (e) {
      toast.error('Failed to connect: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const stopFirehose = () => {
    if (firehoseRef.current) {
      try { firehoseRef.current.close() } catch { /* ignore */ }
      firehoseRef.current = null
      setIsRunning(false)
      setIsConnected(false)
    }
  }

  useEffect(() => () => { stopFirehose() }, [])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="relayer.bbsfans.dev"
                value={relayerUrl}
                onChange={(e) => setRelayerUrl(e.target.value)}
                disabled={isRunning}
              />
            </div>
            {!isRunning ? (
              <Button onClick={startFirehose}><Play className="h-4 w-4" /> Start</Button>
            ) : (
              <Button variant="destructive" onClick={stopFirehose}><Square className="h-4 w-4" /> Stop</Button>
            )}
          </div>
          <div className="flex justify-between items-center pt-3 border-t">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
              <span className="text-sm">{isConnected ? 'Connected' : isRunning ? 'Connecting...' : 'Disconnected'}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEvents([])} disabled={events.length === 0}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {events.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              {isRunning ? (
                <><Loader className="h-5 w-5 animate-spin mx-auto mb-2 opacity-30" />Waiting for events...</>
              ) : (
                'Click "Start" to begin receiving events.'
              )}
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="p-0 overflow-hidden hover:border-primary/50 transition-colors">
              <div
                className="p-3 cursor-pointer flex justify-between items-start bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(event.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    {expandedEvents[event.id] ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-xs font-semibold text-primary font-mono truncate">{event.repo}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 ml-5">
                    {event.ops.map((op, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                        <Badge variant={op.action === 'create' ? 'default' : op.action === 'update' ? 'secondary' : 'destructive'} className="text-[10px] px-1 py-0 h-4 uppercase">
                          {op.action}
                        </Badge>
                        <span className="text-muted-foreground truncate font-mono">{op.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap ml-2">{event.time}</span>
              </div>

              {expandedEvents[event.id] && (
                <div className="p-3 border-t bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Code className="h-3 w-3" /> Full Event Data
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(JSON.stringify(event.raw, null, 2))
                        toast.success('Copied to clipboard')
                      }}
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono bg-zinc-950 text-zinc-300 p-3 rounded-md overflow-x-auto max-h-[300px] leading-relaxed">
                    {JSON.stringify(event.raw, (_key, value) => {
                      if (value instanceof Uint8Array) return `[Uint8Array ${value.length}]`
                      return value
                    }, 2)}
                  </pre>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
