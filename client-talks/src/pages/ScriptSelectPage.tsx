import { useNavigate } from 'react-router-dom'
import { SCRIPTS } from '../talk-rpg/scripts'

interface ScriptSelectPageProps {
  slug: string
}

export default function ScriptSelectPage({ slug }: ScriptSelectPageProps) {
  const navigate = useNavigate()

  return (
    <main className="mx-auto max-w-3xl px-6 py-16" style={{ paddingTop: 'max(4rem, calc(var(--sat) + 2rem))' }}>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choose a script</h1>
      <ul className="mt-8 space-y-3">
        {SCRIPTS.map((script) => (
          <li key={script.id}>
            <button
              className="w-full rounded-xl border border-slate-300 bg-white px-6 py-4 text-left text-lg font-medium text-slate-900 hover:border-slate-400 hover:bg-slate-50 transition-colors"
              onClick={() => navigate(`/talks/${slug}/${script.id}`)}
            >
              {script.name}
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
