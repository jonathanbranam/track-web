import { useEffect, RefObject } from 'react'

export function useVersionGesture(logoRef: RefObject<HTMLElement | null>, onReveal: () => void) {
  useEffect(() => {
    function handleTouch(e: TouchEvent) {
      if (e.touches.length >= 3) onReveal()
    }

    document.addEventListener('touchstart', handleTouch, { passive: true })

    // Triple-click: prefer the provided logo element; fall back to document
    const target: EventTarget = logoRef.current ?? document
    let clickCount = 0
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    function handleClick() {
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

    target.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('touchstart', handleTouch)
      target.removeEventListener('click', handleClick)
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [logoRef, onReveal])
}
