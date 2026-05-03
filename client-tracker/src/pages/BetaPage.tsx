import { Link } from 'react-router-dom'

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-6">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Coming Soon</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          This app is in closed beta. We&rsquo;re not accepting new
          registrations at this time.
        </p>
        <Link
          to="/login"
          className="inline-block mt-6 text-indigo-400 text-sm hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
