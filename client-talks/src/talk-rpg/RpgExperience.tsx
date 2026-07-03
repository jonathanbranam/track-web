import { useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { DirectorProvider, useDirector } from './Director'
import PhaserGame from './PhaserGame'
import Overlay from './Overlay'
import TalkRpgScene from './TalkRpgScene'

function buildConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 800,
    height: parent.clientHeight || 600,
    backgroundColor: '#0a0a1a',
    pixelArt: true,
    scene: [TalkRpgScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Prevent Phaser from adding window-level touchend/mousemove listeners that
    // call preventDefault() and suppress the synthesized click events the React
    // overlay buttons (ADV / expand / fullscreen) depend on. Matches client-games.
    input: { windowEvents: false },
  }
}

function Experience() {
  const director = useDirector()
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [expanded, setExpanded] = useState(false)

  function handleGameReady(game: Phaser.Game) {
    gameRef.current = game
    director.setGame(game)
    game.events.on('segment-complete', director.onSegmentComplete)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        director.advance()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [director])

  // Advance on tap via Phaser's own canvas input rather than a React onClick. On
  // iOS Safari, Phaser calls preventDefault() on canvas touch events, which
  // suppresses the browser-synthesized `click`, so a DOM click handler never
  // fires on mobile. Phaser's scene-level pointer input receives the touch
  // directly (the same mechanism the client-games ball-merge/dungeon scenes use)
  // and works uniformly across desktop and iOS. Taps that land on the DOM
  // overlay buttons don't reach the canvas, so they never trigger an advance.
  // Re-subscribe when `director` changes so we call the current `advance`
  // closure (which reads the latest playing/waiting status).
  useEffect(() => {
    const game = gameRef.current
    if (!game) return
    const onTapAdvance = () => director.advance()
    game.events.on('tap-advance', onTapAdvance)
    return () => {
      game.events.off('tap-advance', onTapAdvance)
    }
  }, [director])

  function handleExpand() {
    setExpanded((v) => !v)
  }

  function handleFullScreen() {
    document.documentElement.requestFullscreen().catch(() => {
      setExpanded(true)
    })
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[#0a0a1a] cursor-pointer select-none"
      style={expanded ? { position: 'fixed', inset: 0, zIndex: 50 } : { height: '100vh' }}
    >
      <PhaserGame buildConfig={buildConfig} onGameReady={handleGameReady} />
      <Overlay expanded={expanded} onExpand={handleExpand} onFullScreen={handleFullScreen} />
    </div>
  )
}

export default function RpgExperience() {
  return (
    <DirectorProvider>
      <Experience />
    </DirectorProvider>
  )
}
