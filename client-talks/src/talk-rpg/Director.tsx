import { ReactNode, createContext, useContext, useMemo, useSyncExternalStore } from 'react'
import { MAP, SCRIPT } from './script'
import { runPrecompute } from './precompute'
import { DirectorEngine, DirectorSnapshot } from './directorEngine'

interface DirectorContextValue extends DirectorSnapshot {
  next: () => void
  back: () => void
  pause: () => void
  resume: () => void
  skipTo: (i: number) => void
  skipForward: () => void
  snapTo: (i: number) => void
}

const DirectorContext = createContext<DirectorContextValue | null>(null)

export function DirectorProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => {
    const checkpoints = runPrecompute(SCRIPT, MAP)
    return new DirectorEngine(SCRIPT, MAP, checkpoints)
  }, [])

  const snapshot = useSyncExternalStore(
    (onStoreChange) => engine.subscribe(onStoreChange),
    () => engine.getSnapshot(),
  )

  const value: DirectorContextValue = {
    ...snapshot,
    next: () => engine.next(),
    back: () => engine.back(),
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    skipTo: (i: number) => engine.skipTo(i),
    skipForward: () => engine.skipForward(),
    snapTo: (i: number) => engine.snapTo(i),
  }

  return <DirectorContext.Provider value={value}>{children}</DirectorContext.Provider>
}

export function useDirector(): DirectorContextValue {
  const ctx = useContext(DirectorContext)
  if (!ctx) throw new Error('useDirector must be used within DirectorProvider')
  return ctx
}
