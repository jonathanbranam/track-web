import { Block } from '../state'
import { COLOR_CLASSES } from './colorTokens'

interface BlockChipProps {
  block: Block
}

export default function BlockChip({ block }: BlockChipProps) {
  return (
    <div
      className={`rounded-lg border px-2 py-1 text-xs font-mono transition-all duration-300 ${COLOR_CLASSES[block.color]} ${
        block.highlighted ? 'ring-2 ring-emerald-300 animate-pulse' : ''
      }`}
    >
      {block.label}
    </div>
  )
}
