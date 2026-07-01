import { Link } from 'react-router-dom'
import { TALKS } from '../talks'

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16" style={{ paddingTop: 'max(4rem, calc(var(--sat) + 2rem))' }}>
      <header className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Talks</h1>
        <p className="mt-3 text-lg text-slate-600">
          Presentations and talk content by Jonathan Branam.
        </p>
      </header>

      <ul className="space-y-4">
        {TALKS.map((talk) => (
          <li key={talk.slug}>
            <Link
              to={`/talks/${talk.slug}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <h2 className="text-xl font-semibold text-slate-900">{talk.title}</h2>
              <p className="mt-2 text-slate-600">{talk.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
