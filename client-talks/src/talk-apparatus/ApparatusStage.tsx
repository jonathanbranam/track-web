import { ApparatusState } from './state'
import BlockChip from './components/BlockChip'
import Gauge from './components/Gauge'
import Counter from './components/Counter'
import StatusPanel from './components/StatusPanel'
import GazeMarker from './components/GazeMarker'
import FeedbackArrow from './components/FeedbackArrow'

interface ApparatusStageProps {
  state: ApparatusState
}

/**
 * The living diagram: one apparatus, mutated across all three stages
 * (design.md's "one apparatus and transform it" decision) — never three
 * separate diagrams.
 */
export default function ApparatusStage({ state }: ApparatusStageProps) {
  const codePaneDimmed = state.statuses.codePaneDimmed !== false
  const costToChange = typeof state.statuses.costToChange === 'number' ? state.statuses.costToChange : 0

  return (
    <div className="grid h-full grid-cols-[1fr_1.2fr_1fr] gap-4 overflow-hidden px-6 pt-14 pb-16 font-mono text-slate-100">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="text-xs text-slate-400">CHAT</div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          {state.chatBlocks.map((block) => (
            <BlockChip key={block.id} block={block} />
          ))}
        </div>
        <GazeMarker target={state.gaze} />
      </div>

      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="text-xs text-slate-400">CONTEXT WINDOW</div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <div className="flex flex-col gap-2">
            {state.windowBlocks.map((block) => (
              <BlockChip key={block.id} block={block} />
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-dashed border-indigo-500/60 pt-3">
            <div className="text-[10px] text-indigo-300">FOUNDATION (pinned)</div>
            {state.foundationBlocks.map((block) => (
              <BlockChip key={block.id} block={block} />
            ))}
          </div>
        </div>
        <Gauge gauge={state.gauge} />
        <Counter counter={state.counter} />
        <StatusPanel statuses={state.statuses} />
      </div>

      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="text-xs text-slate-400">CODE / DIFF</div>
        <div
          className={`min-h-0 flex-1 overflow-y-auto rounded-lg border p-3 text-xs transition-colors duration-500 ${
            codePaneDimmed ? 'border-slate-800 bg-slate-900/30 text-slate-600' : 'border-amber-500 bg-slate-900/80 text-amber-200'
          }`}
        >
          {codePaneDimmed ? 'unwatched…' : `revealed — cost to change: ${costToChange}`}
        </div>

        <div className="text-xs text-slate-400">PLAN SHELF</div>
        <div className="flex max-h-20 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          {state.planShelf.map((block) => (
            <BlockChip key={block.id} block={block} />
          ))}
        </div>

        <div className="text-xs text-slate-400">SKILLS SHELF</div>
        <div className="flex max-h-20 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          {state.skillsShelf.map((block) => (
            <BlockChip key={block.id} block={block} />
          ))}
        </div>
        <FeedbackArrow active={Boolean(state.statuses.feedbackArrow)} />
      </div>
    </div>
  )
}
