import { useCallback, useEffect, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import { DirectorProvider, useDirector } from './Director'
import { DirectorSnapshot } from './directorEngine'
import Overlay from './Overlay'
import PhaserGame from './PhaserGame'
import TalkRpgScene from './TalkRpgScene'

const GAME_WIDTH = 960
const GAME_HEIGHT = 540

function toSnapshot(director: DirectorSnapshot): DirectorSnapshot {
  return {
    status: director.status,
    checkpointIndex: director.checkpointIndex,
    checkpointCount: director.checkpointCount,
    resting: director.resting,
    paused: director.paused,
  }
}

function PhaserStage() {
  const director = useDirector()
  const directorRef = useRef(director)
  directorRef.current = director
  const gameRef = useRef<Phaser.Game | null>(null)

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      pixelArt: true,
      backgroundColor: '#0a0a1a',
      scene: [TalkRpgScene],
    }),
    [],
  )

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    // Read synchronously via the registry (available before the scene finishes
    // booting) so the scene's first frame is never a race against this effect.
    game.registry.set(
      'getSnapshot',
      (): DirectorSnapshot => toSnapshot(directorRef.current),
    )
  }, [])

  useEffect(() => {
    gameRef.current?.events.emit('director-snapshot', toSnapshot(director))
  }, [director])

  return <PhaserGame buildConfig={buildConfig} onGameReady={handleGameReady} />
}

function Experience() {
  const director = useDirector()
  const containerRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        director.next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        director.back()
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        if (director.paused) director.resume()
        else director.pause()
      } else if (e.key === 'Escape' && director.status === 'PLAYING') {
        e.preventDefault()
        if (director.paused) director.resume()
        else director.pause()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [director])

  function handleContainerClick() {
    director.next()
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
      onClick={handleContainerClick}
    >
      <PhaserStage />
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
