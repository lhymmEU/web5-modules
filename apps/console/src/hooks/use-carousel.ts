import { useState, useRef, useCallback, useMemo } from 'react'

export function useCarousel(totalItems: number) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])

  const scrollTo = useCallback((index: number) => {
    setCurrentIndex(index)
    cardRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [])

  const prev = useCallback(() => {
    scrollTo(Math.max(0, currentIndex - 1))
  }, [scrollTo, currentIndex])

  const next = useCallback(() => {
    scrollTo(Math.min(totalItems - 1, currentIndex + 1))
  }, [scrollTo, currentIndex, totalItems])

  const setCardRef = useCallback((index: number) => (el: HTMLElement | null) => {
    cardRefs.current[index] = el
  }, [])

  const navigation = useMemo(() => ({
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalItems - 1,
  }), [currentIndex, totalItems])

  return {
    currentIndex,
    setCurrentIndex,
    scrollRef,
    setCardRef,
    scrollTo,
    prev,
    next,
    ...navigation,
  }
}
