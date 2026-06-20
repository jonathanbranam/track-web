import { useEffect, RefObject } from 'react'

export function useVersionGesture(logoRef: RefObject<HTMLElement | null>, onReveal: () => void) {
  useEffect(() => {
    function handleTouch(e: TouchEvent) {
      if (e.touches.length >= 3) onReveal()
    }

    document.addEventListener('touchstart', handleTouch, { passive: true })

    let clickCount = 0
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    function handleClick(e: MouseEvent) {
      const trigger = logoRef.current ?? document.querySelector('[data-version-trigger]')
      if (!trigger || !trigger.contains(e.target as Node)) return
      clickCount++
      if (clickCount >= 3) {
        clickCount = 0
        if (resetTimer) clearTimeout(resetTimer)
        onReveal()
        return
      }
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => { clickCount = 0 }, 600)
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('touchstart', handleTouch)
      document.removeEventListener('click', handleClick)
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [logoRef, onReveal])
}
