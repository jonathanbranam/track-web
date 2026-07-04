import { useDirector } from './Director'

/** Renders `resting.overlay`'s full-screen/overlaid text card kinds. */
export default function TextCard() {
  const { resting } = useDirector()
  const { overlay } = resting
  if (!overlay) return null

  if (overlay.kind === 'title') {
    return (
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/90">
        <div className="px-8 text-center font-mono text-6xl font-bold uppercase tracking-widest text-white">
          {overlay.text}
        </div>
      </div>
    )
  }

  if (overlay.kind === 'headline') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-10 z-10 flex justify-center">
        <div className="rounded bg-black/80 px-8 py-4 text-center font-mono text-4xl font-bold uppercase tracking-wide text-white shadow-2xl">
          {overlay.text}
        </div>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/70">
      <div className="border-4 border-white bg-slate-900 px-10 py-6 text-center font-mono text-3xl font-bold uppercase tracking-wide text-white shadow-2xl">
        {overlay.text}
      </div>
    </div>
  )
}
