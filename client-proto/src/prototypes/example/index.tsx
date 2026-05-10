import { useNavigate } from 'react-router-dom'

export default function ExamplePrototype() {
  const navigate = useNavigate()
  return (
    <div
      className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center gap-6"
      style={{ paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}
    >
      <p className="text-gray-400 text-lg">Example prototype</p>
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 underline"
      >
        Back to picker
      </button>
    </div>
  )
}
