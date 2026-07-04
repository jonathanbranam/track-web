import { useDirector } from './Director'

interface OverlayProps {
  expanded: boolean
  onExpand: () => void
  onFullScreen: () => void
}

export default function Overlay({ expanded, onExpand, onFullScreen }: OverlayProps) {
  const director = useDirector()

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
      <div className="flex-1" />

      <div className="pointer-events-auto flex items-center gap-2 p-3 justify-end">
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); director.back() }}
          title="Back (←)"
        >
          ◀ BACK
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); director.paused ? director.resume() : director.pause() }}
          title="Pause / Resume (P)"
        >
          {director.paused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); director.next() }}
          title="Next (→)"
        >
          ▶ NEXT
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); onExpand() }}
          title={expanded ? 'Exit Expand' : 'Expand'}
        >
          {expanded ? '⊡' : '⊞'}
        </button>
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); onFullScreen() }}
          title="Full Screen"
        >
          ⛶
        </button>
      </div>
    </div>
  )
}
