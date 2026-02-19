import { PenTool, ShieldCheck, Hammer, Trophy } from 'lucide-react'
import { concepts } from '@/content/concepts'
import type { ChapterId } from './types'

export const CHAPTERS = concepts.playground.chapters
export const CHAPTER_IDS: ChapterId[] = ['sign', 'verify', 'create-did', 'manage-did']
export const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  'sign': PenTool,
  'verify': ShieldCheck,
  'create-did': Hammer,
  'manage-did': Trophy,
}
