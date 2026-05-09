import { Link } from 'react-router-dom'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 -ml-1 group cursor-pointer w-fit" aria-label={`Back to ${label}`}>
      <span className="text-gray-400 group-hover:text-white transition-colors p-1">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      <span className="text-base font-semibold">{label}</span>
    </Link>
  )
}
