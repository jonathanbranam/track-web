import { useEffect, useRef, useState } from 'react'
import { CounterState } from '../state'

const DURATION_MS: Record<CounterState['speed'], number> = {
  fast: 350,
  slow: 1400,
}

interface CounterProps {
  counter: CounterState
}

/**
 * Animates a count-up toward `counter.value` at a rate set by `counter.speed`.
 * Purely presentational — the underlying state is always the exact target
 * value, so this tween never gates `next()`/`skipForward()` (design.md's
 * skip-exactness decision): a skip simply snaps the displayed number too,
 * since the effect re-triggers from whatever value is currently mounted.
 */
export default function Counter({ counter }: CounterProps) {
  const [displayed, setDisplayed] = useState(counter.value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = displayed
    const to = counter.value
    if (from === to) return
    const duration = DURATION_MS[counter.speed]
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplayed(Math.round(from + (to - from) * progress))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter.value, counter.speed])

  return (
    <div className="flex items-baseline gap-1.5 font-mono text-xs text-slate-500">
      <span>TOKENS</span>
      <span className="text-sm text-slate-800">{displayed.toLocaleString()}</span>
    </div>
  )
}
