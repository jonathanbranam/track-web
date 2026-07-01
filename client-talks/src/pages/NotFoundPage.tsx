import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16" style={{ paddingTop: 'max(4rem, calc(var(--sat) + 2rem))' }}>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Talk not found</h1>
      <p className="mt-3 text-slate-600">We couldn&rsquo;t find the talk you were looking for.</p>
      <Link to="/" className="mt-8 inline-block text-sm font-medium text-slate-500 hover:text-slate-800">
        ← All talks
      </Link>
    </main>
  )
}
