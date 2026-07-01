import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import TalkPage from './pages/TalkPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] bg-slate-100 text-slate-900">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/talks/:slug" element={<TalkPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
