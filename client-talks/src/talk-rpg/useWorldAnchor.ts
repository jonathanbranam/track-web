import { createContext, useContext, useEffect, useRef } from 'react'
import * as Phaser from 'phaser'

/** Provides the live `Phaser.Game` instance (once created) to overlay components that need it. */
export const GameBridgeContext = createContext<Phaser.Game | null>(null)

const GAME_WIDTH = 960

/**
 * Tracks a world-space entity's on-screen position at animation-frame rate,
 * writing only an imperative `transform` style on a ref (never `setState`
 * per frame). Reads the game registry's `getScreenPosition` (set up in
 * `RpgExperience.tsx`, backed by `TalkRpgScene`) rather than `useDirector()`'s
 * `resting`, since `resting` only updates once per discrete world mutation —
 * not once per rendered Phaser frame — so an anchor driven by it would
 * visibly jump instead of tracking the camera's smooth pan (design.md's
 * world-anchoring Decision).
 *
 * The returned ref should be attached to a `position: fixed; inset: 0` (or
 * `top:0; left:0`) element — the transform positions its origin at the
 * entity's actual on-screen point, scaled to the canvas's real rendered
 * size (`getBoundingClientRect()`), not its configured internal resolution.
 */
export function useWorldAnchor(entityId: string) {
  const game = useContext(GameBridgeContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!game) return
    let frameId: number

    const tick = () => {
      const el = ref.current
      const getScreenPosition = game.registry.get('getScreenPosition') as
        | ((id: string) => { x: number; y: number } | null)
        | undefined
      const pos = getScreenPosition?.(entityId)
      if (el) {
        if (pos) {
          const canvasRect = game.canvas.getBoundingClientRect()
          const scale = canvasRect.width / GAME_WIDTH
          el.style.transform = `translate(${canvasRect.left + pos.x * scale}px, ${canvasRect.top + pos.y * scale}px)`
          el.style.display = ''
        } else {
          el.style.display = 'none'
        }
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [game, entityId])

  return ref
}
