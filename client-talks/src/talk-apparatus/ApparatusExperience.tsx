import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BeatAction } from './actions'
import { ApparatusDirectorProvider, useApparatusDirector } from './Director'
import ApparatusStage from './ApparatusStage'
import ColdOpenStage from './ColdOpenStage'
import CloseStage from './CloseStage'

const STAGE_WIDTH = 960
const STAGE_HEIGHT = 540

function describeNextAction(action: BeatAction | null): string {
  if (!action) return 'END'
  switch (action.type) {
    case 'spawnBlock':
    case 'promoteBlock':
    case 'evictBlock':
    case 'highlightBlock':
    case 'pinFoundation':
    case 'unpinFoundation':
      return `${action.type}(${action.id})`
    case 'compactBlocks':
      return `compactBlocks(${action.ids.join(',')})`
    case 'flush':
      return `flush(${action.shelf})`
    case 'setGauge':
      return `setGauge(${action.percent}%)`
    case 'setCounter':
      return `setCounter(${action.value}, ${action.speed})`
    case 'flipStatus':
      return `flipStatus(${action.key})`
    case 'moveGaze':
      return `moveGaze(${action.target})`
    case 'sceneSwap':
      return `sceneSwap(${action.stageKind})`
    default:
      return action.type
  }
}

function Experience() {
  const director = useApparatusDirector()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        director.next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        director.back()
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.preventDefault()
        if (director.paused) director.resume()
        else director.pause()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [director])

  const { resting, checkpointIndex, checkpointCount, nextAction } = director
  const checkpointsReached = Math.max(checkpointIndex + 1, 0)

  return (
    <div
      className="relative mx-auto overflow-hidden border border-slate-300 bg-slate-100 cursor-pointer select-none"
      style={
        expanded
          ? { position: 'fixed', inset: 0, zIndex: 50 }
          : {
              width: '100%',
              maxWidth: STAGE_WIDTH,
              height: 'auto',
              maxHeight: '100dvh',
              aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}`,
            }
      }
      onClick={() => director.next()}
    >
      {resting.stageKind === 'coldOpen' && <ColdOpenStage statuses={resting.statuses} />}
      {resting.stageKind === 'apparatus' && <ApparatusStage state={resting} />}
      {resting.stageKind === 'close' && <CloseStage statuses={resting.statuses} />}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="flex items-center justify-between gap-2 p-3">
          <span className="rounded border border-slate-300 bg-white/80 px-2 py-1 font-mono text-xs text-slate-700">
            {checkpointsReached} / {checkpointCount}
          </span>
          <span
            className="rounded border border-slate-300 bg-white/80 px-2 py-1 font-mono text-xs text-slate-500"
            title="Presenter-only: what the next spacebar/click press will apply"
          >
            next: {describeNextAction(nextAction)}
          </span>
        </div>

        <div className="flex-1" />

        <div
          className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 px-3 pt-3 pb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            onClick={() => director.restart()}
            title="Restart"
          >
            ⏮ RESTART
          </button>
          <button
            className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
            onClick={() => navigate('/talks/ai-eng-dynamic')}
            title="Back to talk"
          >
            ☰ TALK
          </button>
          <div className="flex items-center gap-2">
            <button
              className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
              onClick={() => director.back()}
              title="Back (←)"
            >
              ◀ BACK
            </button>
            <button
              className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
              onClick={() => (director.paused ? director.resume() : director.pause())}
              title="Pause / Resume (P)"
            >
              {director.paused ? '▶ RESUME' : '⏸ PAUSE'}
            </button>
            <button
              className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
              onClick={() => director.next()}
              title="Next (→ / space)"
            >
              ▶ NEXT
            </button>
            <button
              className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
              onClick={() => director.skipForward()}
              title="Skip ahead"
            >
              ⏭ SKIP
            </button>
            <button
              className="rounded border border-slate-300 bg-white/80 px-3 py-1.5 font-mono text-xs text-slate-600 transition-colors hover:bg-white hover:text-slate-900"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Exit Expand' : 'Expand'}
            >
              {expanded ? '⊡' : '⊞'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ApparatusExperienceProps {
  script: BeatAction[]
}

export default function ApparatusExperience({ script }: ApparatusExperienceProps) {
  return (
    <ApparatusDirectorProvider script={script}>
      <Experience />
    </ApparatusDirectorProvider>
  )
}
