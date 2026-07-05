import { useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { VersionOverlay } from '@repo/ui'
import LandingPage from './pages/LandingPage'
import TalkPage from './pages/TalkPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  // VersionOverlay's built-in desktop trigger is sized `height: var(--sat, 44px)`,
  // but this app defines `--sat: env(safe-area-inset-top, 0px)` globally, which
  // collapses that strip to 0px on desktop (the 44px fallback only applies when
  // --sat is undefined). Supply an explicitly-sized top-left trigger so the
  // triple-click affordance works here; the three-finger-tap path is
  // document-level and unaffected.
  const versionTriggerRef = useRef<HTMLDivElement>(null)

  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/talks/:slug/:script?" element={<TalkPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {/* Three-finger tap (mobile) / triple-click the top-left corner (desktop)
            reveals the client-vs-server build check, same as the other apps. */}
        <div ref={versionTriggerRef} aria-hidden className="fixed left-0 top-0 z-[9998] h-11 w-11" />
        <VersionOverlay clientSha={__COMMIT_SHA__} buildTime={__BUILD_TIME__} logoRef={versionTriggerRef} />
      </div>
    </BrowserRouter>
  )
}
