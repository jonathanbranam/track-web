import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PickerScreen from './pages/PickerScreen'
import ProtoShell from './pages/ProtoShell'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PickerScreen />} />
        <Route path="/proto/:name/*" element={<ProtoShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
