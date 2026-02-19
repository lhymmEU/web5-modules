export type ChapterId = 'sign' | 'verify' | 'manage-did'

export interface SignData {
  message: string
  signature: string
  didKey: string
}

export interface DidOps {
  updateKey: boolean
  updateHandle: boolean
  transfer: boolean
  destroy: boolean
}
