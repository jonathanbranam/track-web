import { Block } from '../state'
import { COLOR_CLASSES } from './colorTokens'

interface BlockChipProps {
  block: Block
  /**
   * Plays a one-shot entrance animation when the chip first mounts: `'chat'`
   * fades a new message up into the chat log, `'window'` slides a promoted copy
   * in from the chat side. Omit for chips that should appear without motion
   * (shelves, foundation). The animation runs on mount only, so React reuses the
   * keyed DOM node on re-render and does not replay it while parked at a checkpoint.
   */
  enter?: 'chat' | 'window'
}

export default function BlockChip({ block, enter }: BlockChipProps) {
  const enterClass = enter === 'chat' ? 'apparatus-enter-chat' : enter === 'window' ? 'apparatus-enter-window' : ''
  return (
    <div
      className={`rounded-lg border px-2 py-1 text-xs font-mono transition-all duration-300 ${COLOR_CLASSES[block.color]} ${enterClass} ${
        block.highlighted ? 'ring-2 ring-emerald-300 animate-pulse' : ''
      }`}
    >
      {block.label}
    </div>
  )
}
