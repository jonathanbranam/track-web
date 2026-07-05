import { useDirector } from './Director'

interface OverlayProps {
  expanded: boolean
  onExpand: () => void
  onFullScreen: () => void
}

export default function Overlay({ expanded, onExpand, onFullScreen }: OverlayProps) {
  const director = useDirector()

  const checkpointsReached = Math.max(director.checkpointIndex + 1, 0)

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
      <div className="flex items-center gap-2 p-3">
        <span className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-white/80">
          {checkpointsReached} / {director.checkpointCount}
        </span>
        {director.status === 'PLAYING' && (
          <span
            className="flex items-center gap-1.5 rounded bg-black/40 px-2 py-1 font-mono text-xs text-emerald-400"
            title="Playback in progress — next() is a no-op until this segment reaches its stop"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            PLAYING
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div
        className="pointer-events-auto flex flex-wrap items-center gap-2 gap-y-2 px-3 pt-3 justify-between"
        style={{ paddingBottom: 'max(0.75rem, calc(var(--sab) + 0.5rem))' }}
      >
        <button
          className="rounded px-3 py-1.5 text-xs font-mono text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
          onClick={(e) => { e.stopPropagation(); director.restart() }}
          title="Restart — returns to the very beginning of the presentation"
        >
          ⏮ RESTART
        </button>
        <div className="flex items-center gap-2">
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
            onClick={(e) => { e.stopPropagation(); director.skipForward() }}
            title="Skip ahead — completes a playing animation instantly, or jumps to the next section if already at rest"
          >
            ⏭ SKIP
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
    </div>
  )
}
