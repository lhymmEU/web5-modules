export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface RecordEntry {
  uri: string
  cid: string
  value: Record<string, unknown>
}

export interface FirehoseOp {
  action: string
  path: string
  uri: string
  record?: unknown
  cid?: string
}

export interface FirehoseEvent {
  id: string
  time: string
  repo: string
  ops: FirehoseOp[]
  raw: unknown
}
