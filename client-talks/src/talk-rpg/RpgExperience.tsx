import { useEffect, useRef, useState } from 'react'
import { DirectorProvider, useDirector } from './Director'
import Overlay from './Overlay'

const TILE_SIZE = 48

const ENTITY_COLORS: Record<string, string> = {
  pc: '#3b82f6',
  guide: '#f59e0b',
}

function PlaceholderStage() {
  const { resting } = useDirector()

  return (
    <div className="absolute inset-0 overflow-hidden">
      {Object.values(resting.entities).map((entity) => (
        <div
          key={entity.id}
          className="absolute rounded-sm border border-white/40 transition-[left,top] duration-100"
          style={{
            left: entity.x * TILE_SIZE,
            top: entity.y * TILE_SIZE,
            width: TILE_SIZE * 0.8,
            height: TILE_SIZE * 0.8,
            backgroundColor: ENTITY_COLORS[entity.id] ?? '#94a3b8',
          }}
          title={`${entity.id} facing ${entity.facing}`}
        />
      ))}

      {resting.dialogue.open && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center px-8">
          <p className="rounded bg-black/70 px-4 py-2 font-mono text-sm text-white">
            {resting.dialogue.text || '…'}
          </p>
        </div>
      )}
    </div>
  )
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
      <PlaceholderStage />
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
