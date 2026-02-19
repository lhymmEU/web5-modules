import { PenTool, ShieldCheck, Trophy } from 'lucide-react'
import { concepts } from '@/content/concepts'
import type { ChapterId } from './types'

export const CHAPTERS = concepts.playground.chapters
export const CHAPTER_IDS: ChapterId[] = ['sign', 'verify', 'manage-did']
export const CHAPTER_ICONS: Record<ChapterId, React.ElementType> = {
  'sign': PenTool,
  'verify': ShieldCheck,
  'manage-did': Trophy,
}
