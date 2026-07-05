import { ReactNode, createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { BeatAction } from './actions'
import { runPrecompute } from './precompute'
import { ApparatusDirectorEngine, ApparatusDirectorSnapshot } from './directorEngine'

interface ApparatusDirectorContextValue extends ApparatusDirectorSnapshot {
  next: () => void
  back: () => void
  restart: () => void
  pause: () => void
  resume: () => void
  skipTo: (i: number) => void
  skipForward: () => void
  snapTo: (i: number) => void
}

const ApparatusDirectorContext = createContext<ApparatusDirectorContextValue | null>(null)

interface ApparatusDirectorProviderProps {
  script: BeatAction[]
  children: ReactNode
}

export function ApparatusDirectorProvider({ script, children }: ApparatusDirectorProviderProps) {
  const engine = useMemo(() => {
    const checkpoints = runPrecompute(script)
    return new ApparatusDirectorEngine(script, checkpoints)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const snapshot = useSyncExternalStore(
    (onStoreChange) => engine.subscribe(onStoreChange),
    () => engine.getSnapshot(),
  )

  const value: ApparatusDirectorContextValue = {
    ...snapshot,
    next: () => engine.next(),
    back: () => engine.back(),
    restart: () => engine.restart(),
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    skipTo: (i: number) => engine.skipTo(i),
    skipForward: () => engine.skipForward(),
    snapTo: (i: number) => engine.snapTo(i),
  }

  return <ApparatusDirectorContext.Provider value={value}>{children}</ApparatusDirectorContext.Provider>
}

export function useApparatusDirector(): ApparatusDirectorContextValue {
  const ctx = useContext(ApparatusDirectorContext)
  if (!ctx) throw new Error('useApparatusDirector must be used within ApparatusDirectorProvider')
  return ctx
}
