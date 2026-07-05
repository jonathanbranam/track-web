import { Block } from '../state'
import { COLOR_CLASSES } from './colorTokens'

interface ChatBubbleProps {
  block: Block
  /**
   * Plays the one-shot mount entrance. `true` slides the bubble in from its own
   * side (user from the right, agent from the left); omit for a bubble that
   * should appear without motion. Like every animation here it runs on mount
   * only, so back/skip still land instantly on the resting state.
   */
  enter?: boolean
}

/**
 * One message in the chat transcript, rendered as a two-sided conversation:
 * `user` messages flush right with a small gap on the left, `agent` replies
 * flush left with a small gap on the right — the iMessage / Claude Code chat
 * layout the presenter asked for.
 *
 * Speaker identity is carried by *position* (side, tail corner, entrance
 * direction, a small sender label), never by a new fill color — the bubble fill
 * stays on the apparatus's three-color register (green/anchor/muted) so the
 * "remember" beat's green message reads the same in the chat as everywhere else.
 */
export default function ChatBubble({ block, enter }: ChatBubbleProps) {
  const isUser = (block.speaker ?? 'user') === 'user'
  const enterClass = enter ? (isUser ? 'apparatus-enter-chat-user' : 'apparatus-enter-chat-agent') : ''

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} ${enterClass}`}>
      <span className="px-1 pb-0.5 text-[9px] uppercase tracking-wide text-slate-500">
        {isUser ? 'you' : '✦ agent'}
      </span>
      <div
        className={`max-w-[82%] border px-2 py-1 text-xs font-mono transition-all duration-300 ${COLOR_CLASSES[block.color]} ${
          isUser ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
        } ${block.highlighted ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
      >
        {block.label}
      </div>
    </div>
  )
}
