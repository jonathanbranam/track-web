import { useEffect, useRef, useState } from 'react'
import { useDirector } from './Director'

const FADE_MS = 300

/**
 * Renders `resting.achievement` as a fixed toast, independent of the `ui`/
 * `overlay` slots. Fades in/out only on live entry/exit (`status ===
 * 'PLAYING'`); a `snapTo`/`back`/`skipTo` jump shows or clears it instantly —
 * the same one-shot-flourish convention as `TalkRpgScene`'s encounter flash
 * and floating damage numbers.
 */
export default function AchievementToast() {
  const { resting, status } = useDirector()
  const text = resting.achievement?.text ?? null
  const prevTextRef = useRef(text)
  const [displayedText, setDisplayedText] = useState(text)
  const [visible, setVisible] = useState(text !== null)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const prevText = prevTextRef.current
    prevTextRef.current = text
    if (text === prevText) return

    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    const live = status === 'PLAYING'

    if (text !== null) {
      setDisplayedText(text)
      if (live) {
        setVisible(false)
        requestAnimationFrame(() => setVisible(true))
      } else {
        setVisible(true)
      }
    } else if (live) {
      setVisible(false)
      hideTimeoutRef.current = setTimeout(() => setDisplayedText(null), FADE_MS)
    } else {
      setVisible(false)
      setDisplayedText(null)
    }
  }, [text, status])

  if (displayedText === null) return null

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-6 z-20 -translate-x-1/2 transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="rounded border-2 border-yellow-400 bg-slate-900/95 px-6 py-3 text-center font-mono text-lg font-bold uppercase tracking-wide text-yellow-300 shadow-2xl">
        {displayedText}
      </div>
    </div>
  )
}
