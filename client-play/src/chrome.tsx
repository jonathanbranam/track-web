import { createContext, useContext, useState, type ReactNode } from 'react'

// App-shell chrome state. Lets a page hide shell-level UI (currently the
// floating UserChip) while it needs the full screen — e.g. scoring a game.
interface ChromeContextValue {
  chromeHidden: boolean
  setChromeHidden: (hidden: boolean) => void
}

const ChromeContext = createContext<ChromeContextValue>({
  chromeHidden: false,
  setChromeHidden: () => {},
})

export function ChromeProvider({ children }: { children: ReactNode }) {
  const [chromeHidden, setChromeHidden] = useState(false)
  return (
    <ChromeContext.Provider value={{ chromeHidden, setChromeHidden }}>
      {children}
    </ChromeContext.Provider>
  )
}

export function useChrome() {
  return useContext(ChromeContext)
}
