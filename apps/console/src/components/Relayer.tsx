
import { useState, useEffect, useRef } from 'react';
import { Activity, Loader, Play, Square, Server, Trash2, ChevronDown, ChevronRight, Code } from 'lucide-react';
import { Firehose, type CommitEvent } from '@skyware/firehose';

interface FirehoseEvent {
  id: string;
  time: string;
  repo: string;
  ops: {
    action: string;
    path: string;
    uri: string;
    record?: any;
    cid?: string;
  }[];
  raw: any; // Store the full raw message
}

export function Relayer() {
  const [relayerUrl, setRelayerUrl] = useState('relayer.bbsfans.dev');
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<FirehoseEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  
  const firehoseRef = useRef<Firehose | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isRunning) {
      scrollToBottom();
    }
  }, [events]);

  const startFirehose = () => {
    if (firehoseRef.current) return;

    try {
      const url = relayerUrl.startsWith('ws') ? relayerUrl : `wss://${relayerUrl}`;
      console.log("Connecting to Relayer:", url);
      
      const firehose = new Firehose({
        relay: url,
      });

      firehose.on("commit", (message: CommitEvent) => {
        const newEvent: FirehoseEvent = {
          id: Math.random().toString(36).substring(7),
          time: new Date().toLocaleTimeString(),
          repo: message.repo,
          ops: message.ops.map(op => ({
            action: op.action,
            path: op.path,
            uri: `at://${message.repo}/${op.path}`,
            record: (op as any).record,
            cid: (op as any).cid
          })),
          raw: message
        };

        setEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
      });

      firehose.on("open", () => {
        setIsConnected(true);
      });

      firehose.on("close", () => {
        setIsConnected(false);
        setIsRunning(false);
        firehoseRef.current = null;
      });

      firehose.on("error", (err: any) => {
        console.error("Firehose error:", err);
        setIsConnected(false);
        setIsRunning(false);
        firehoseRef.current = null;
      });

      firehoseRef.current = firehose;
      setIsRunning(true);
      firehose.start();
    } catch (e) {
      console.error("Failed to start firehose:", e);
      alert("Failed to connect to Relayer: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  const stopFirehose = () => {
    if (firehoseRef.current) {
      try {
        firehoseRef.current.close();
      } catch (e) {
        console.error("Error stopping firehose:", e);
      }
      firehoseRef.current = null;
      setIsRunning(false);
      setIsConnected(false);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  useEffect(() => {
    return () => {
      stopFirehose();
    };
  }, []);

  return (
    <div className="container">
      <div className="flex items-center gap-md mb-lg">
        <div className="bg-primary-light p-sm rounded text-primary" style={{ background: '#e0e7ff', color: '#4338ca' }}>
          <Activity size={24} />
        </div>
        <div>
          <h2 className="m-0 text-lg">Relayer Firehose</h2>
          <div className="text-muted text-sm">Subscribe to real-time event stream from AT Protocol Relayer</div>
        </div>
      </div>

      <div className="flex-col gap-lg">
        <div className="card">
          <div className="flex-col gap-md">
            <div className="input-group vertical">
              <label className="text-sm font-medium text-muted mb-xs block">Relayer Address</label>
              <div className="flex gap-sm items-center">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted flex items-center">
                    <Server size={16} />
                  </div>
                  <input 
                    className="input pl-10 h-9" 
                    placeholder="relayer.bbsfans.dev" 
                    value={relayerUrl}
                    onChange={(e) => setRelayerUrl(e.target.value)}
                    disabled={isRunning}
                  />
                </div>
                <div className="flex shrink-0">
                  {!isRunning ? (
                    <button 
                      className="btn btn-primary h-9"
                      onClick={startFirehose}
                    >
                      <Play size={16} /> Start
                    </button>
                  ) : (
                    <button 
                      className="btn btn-danger h-9"
                      onClick={stopFirehose}
                    >
                      <Square size={16} /> Stop
                    </button>
                  )}
                </div>
              </div>
            </div>

          <div className="flex justify-between items-center pt-md border-t border-slate-100">
            <div className="flex items-center gap-sm">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-slate-300'}`}></div>
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : isRunning ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={clearEvents}
              disabled={events.length === 0}
            >
              <Trash2 size={14} /> Clear Log
            </button>
          </div>
        </div>
      </div>

      <div className="flex-col gap-sm">
        {events.length === 0 ? (
          <div className="card text-center py-xl border-dashed">
            <div className="text-muted mb-sm">
              {isRunning ? 'Waiting for events...' : 'Click "Start" to begin receiving events.'}
            </div>
            {isRunning && <Loader size={24} className="spin mx-auto opacity-20" />}
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            {events.map((event) => (
              <div key={event.id} className="card p-0 overflow-hidden hover:border-primary transition-colors">
                {/* Header - Clickable to toggle expand */}
                <div 
                  className="p-md cursor-pointer flex justify-between items-start bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpand(event.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm mb-xs">
                      {expandedEvents[event.id] ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                      <div className="text-xs font-bold text-primary font-mono truncate" title={event.repo}>
                        {event.repo}
                      </div>
                    </div>
                    <div className="flex flex-col gap-xs ml-5">
                      {event.ops.map((op, idx) => (
                        <div key={idx} className="flex items-center gap-sm text-[10px]">
                          <span className={`font-bold uppercase px-1 rounded ${
                            op.action === 'create' ? 'bg-green-100 text-green-700' :
                            op.action === 'update' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {op.action}
                          </span>
                          <span className="text-muted truncate font-mono">
                            {op.path}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted font-mono whitespace-nowrap bg-white border border-slate-200 px-1.5 py-0.5 rounded ml-sm">
                    {event.time}
                  </div>
                </div>

                {/* Expanded Content - JSON Details */}
                {expandedEvents[event.id] && (
                  <div className="p-md border-t border-slate-100 bg-white">
                    <div className="flex items-center gap-sm mb-sm text-xs font-medium text-muted">
                      <Code size={12} /> Full Event Data
                    </div>
                    <div className="relative">
                      <pre className="text-[11px] font-mono bg-slate-900 text-slate-300 p-sm rounded overflow-x-auto max-h-[300px] leading-relaxed">
                        {JSON.stringify(event.raw, (_key, value) => {
                          if (value instanceof Uint8Array) return `[Uint8Array ${value.length}]`;
                          return value;
                        }, 2)}
                      </pre>
                      <button 
                        className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(JSON.stringify(event.raw, null, 2));
                        }}
                        title="Copy JSON"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
