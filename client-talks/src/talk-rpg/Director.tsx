import { createContext, useContext, useReducer, useRef, ReactNode } from 'react'
import * as Phaser from 'phaser'

interface DirectorState {
  currentBeat: number
  status: 'waiting' | 'playing'
}

type DirectorAction =
  | { type: 'ADVANCE' }
  | { type: 'SEGMENT_COMPLETE' }

function reducer(state: DirectorState, action: DirectorAction): DirectorState {
  switch (action.type) {
    case 'ADVANCE':
      if (state.status === 'playing') return state
      return { currentBeat: state.currentBeat + 1, status: 'playing' }
    case 'SEGMENT_COMPLETE':
      return { ...state, status: 'waiting' }
    default:
      return state
  }
}

interface DirectorContextValue {
  currentBeat: number
  status: 'waiting' | 'playing'
  advance: () => void
  onSegmentComplete: () => void
  setGame: (game: Phaser.Game) => void
}

const DirectorContext = createContext<DirectorContextValue | null>(null)

export function DirectorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { currentBeat: 0, status: 'waiting' })
  const gameRef = useRef<Phaser.Game | null>(null)

  function advance() {
    if (state.status === 'playing') return
    const nextBeat = state.currentBeat + 1
    dispatch({ type: 'ADVANCE' })
    gameRef.current?.events.emit('beat', nextBeat)
  }

  function onSegmentComplete() {
    dispatch({ type: 'SEGMENT_COMPLETE' })
  }

  function setGame(game: Phaser.Game) {
    gameRef.current = game
  }

  return (
    <DirectorContext.Provider value={{ currentBeat: state.currentBeat, status: state.status, advance, onSegmentComplete, setGame }}>
      {children}
    </DirectorContext.Provider>
  )
}

export function useDirector(): DirectorContextValue {
  const ctx = useContext(DirectorContext)
  if (!ctx) throw new Error('useDirector must be used within DirectorProvider')
  return ctx
}
