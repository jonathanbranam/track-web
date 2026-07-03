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
  }
}

function Experience() {
  const director = useDirector()
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  function handleGameReady(game: Phaser.Game) {
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

  // Advance on tap/click. We use pointer events rather than onClick because on
  // iOS Safari, Phaser's input system calls preventDefault() on the canvas touch
  // events (input.touch.capture defaults to true), which suppresses the
  // browser-synthesized `click`. `pointerup` fires uniformly for mouse and touch
  // across desktop and iOS, so taps advance the talk on mobile too.
  function handleContainerPointerUp() {
    director.advance()
  }

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
      onPointerUp={handleContainerPointerUp}
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
