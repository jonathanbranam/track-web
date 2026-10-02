import { useEffect, useRef } from 'react'

/**
 * Dev-only `window.__game`, so a playtester can read state and make moves without
 * clicking pixels. Every call site is guarded by `import.meta.env.DEV`, which Vite
 * folds to `false` in production, so none of this ships.
 *
 *   __game.name                 game id
 *   __game.getState()           current game state (plain JSON-able object)
 *   __game.legalMoves()         every legal move, as objects `move` accepts
 *   __game.move(m)              apply a move; false if illegal or the game is over
 *   __game.restart()            new game
 */
export interface GameHook<S, M> {
  name: string
  state: S
  setState: (s: S) => void
  legalMoves: (s: S) => M[]
  apply: (s: S, m: M) => S
  newGame: () => S
}

export function useGameHook<S, M>(hook: GameHook<S, M>): void {
  const ref = useRef(hook)
  ref.current = hook
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __game?: unknown }
    w.__game = {
      name: hook.name,
      getState: () => ref.current.state,
      legalMoves: () => (ref.current.state && (ref.current.state as { over?: boolean }).over ? [] : ref.current.legalMoves(ref.current.state)),
      move: (m: M) => {
        const h = ref.current
        const next = h.apply(h.state, m)
        if (next === h.state) return false
        h.state = next
        h.setState(next)
        return true
      },
      restart: () => {
        const h = ref.current
        h.state = h.newGame()
        h.setState(h.state)
      },
    }
    return () => {
      delete w.__game
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.name])
}
