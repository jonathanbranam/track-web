import { Link, useParams } from 'react-router-dom'
import { getTalk } from '../talks'
import NotFoundPage from './NotFoundPage'
import ScriptSelectPage from './ScriptSelectPage'
import RpgExperience from '../talk-rpg/RpgExperience'
import { SCRIPTS } from '../talk-rpg/scripts'
import ApparatusExperience from '../talk-apparatus/ApparatusExperience'
import { AI_ENG_DYNAMIC_SCRIPT } from '../talk-apparatus/script'

export default function TalkPage() {
  const { slug, script: scriptId } = useParams<{ slug: string; script?: string }>()
  const talk = getTalk(slug)

  if (!talk) {
    return <NotFoundPage />
  }

  if (talk.kind === 'rpg') {
    const namedScript = SCRIPTS.find((s) => s.id === scriptId)
    if (!namedScript) {
      return <ScriptSelectPage slug={talk.slug} />
    }
    return <RpgExperience namedScript={namedScript} />
  }

  if (talk.kind === 'apparatus') {
    return <ApparatusExperience script={AI_ENG_DYNAMIC_SCRIPT} />
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16" style={{ paddingTop: 'max(4rem, calc(var(--sat) + 2rem))' }}>
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← All talks
      </Link>

      <article className="mt-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{talk.title}</h1>
        <p className="mt-4 text-lg text-slate-600">{talk.description}</p>

        <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          Content coming soon.
        </div>
      </article>
    </main>
  )
}
