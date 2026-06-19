import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

interface PhaserGameProps {
  /** Build the Phaser game config given the parent DOM element to render into. */
  buildConfig: (parent: HTMLElement) => Phaser.Types.Core.GameConfig
  /** Called once after the Phaser game is created — wire up event listeners here. */
  onGameReady?: (game: Phaser.Game) => void
}

/**
 * Generic React host for a Phaser game. Creates the `Phaser.Game` on mount and
 * destroys it on unmount. The surrounding React UI (score, game-over overlay)
 * communicates with the scene via the game's event emitter, supplied through
 * `onGameReady`.
 */
export default function PhaserGame({ buildConfig, onGameReady }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    const game = new Phaser.Game(buildConfig(parent))
    onGameReady?.(game)

    return () => {
      game.destroy(true)
    }
    // Intentionally run once on mount; buildConfig/onGameReady are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="w-full h-full" style={{ touchAction: 'none' }} />
}
