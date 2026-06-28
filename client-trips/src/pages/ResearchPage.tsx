import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Components } from 'react-markdown'
import { api } from '../api'
import type { Trip } from '../types'
import MarkdownContent from '../components/MarkdownContent'
import { buildToc } from '../lib/toc'

const TOP_ANCHOR = 'research-top'

/** Small "return to top" affordance appended to each section heading. */
function ReturnToTop() {
  return (
    <a
      href={`#${TOP_ANCHOR}`}
      className="ml-2 align-middle text-xs font-normal text-gray-500 hover:text-indigo-400 no-underline"
      aria-label="Return to top"
      title="Return to top"
    >
      ↑ top
    </a>
  )
}

// Heading overrides add the return-to-top control and scroll margin. Ids are
// assigned after render in a layout effect (see below) so they stay aligned
// with buildToc even under React's double-invoked dev renders.
const headingComponents: Components = {
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-white mt-6 mb-2 first:mt-0 scroll-mt-20">
      {children}
      <ReturnToTop />
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-white mt-4 mb-2 scroll-mt-20">
      {children}
      <ReturnToTop />
    </h3>
  ),
}

export default function ResearchPage() {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [noTrip, setNoTrip] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.trips.current()
      .then(({ trip }) => setTrip(trip))
      .catch((err: { status?: number }) => {
        if (err.status === 404) setNoTrip(true)
      })
      .finally(() => setLoading(false))
  }, [])

  const markdown = trip?.researchMarkdown
  const toc = buildToc(markdown)

  // Assign heading ids in document order to match buildToc. Querying the
  // rendered H2/H3 after commit (rather than counting during render) keeps the
  // TOC links and heading anchors in sync regardless of how often React renders.
  useLayoutEffect(() => {
    const root = contentRef.current
    if (!root) return
    const headings = root.querySelectorAll('h2, h3')
    toc.forEach((entry, i) => {
      const el = headings[i]
      if (el) el.id = entry.id
    })
  }, [markdown, toc])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <span id={TOP_ANCHOR} className="scroll-mt-20" />
      <h1 className="text-2xl font-bold text-white mb-6">Research</h1>

      {noTrip || !trip || !markdown ? (
        <div className="text-gray-500 text-center py-12">
          <p className="text-lg font-medium text-gray-400">No research yet</p>
          <p className="text-sm mt-1">Research notes for this trip will appear here once added.</p>
        </div>
      ) : (
        <>
          {toc.length > 0 && (
            <nav aria-label="Table of contents" className="mb-6 rounded-lg bg-gray-800 border border-gray-700 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Contents</p>
              <ul className="space-y-1">
                {toc.map((entry) => (
                  <li key={entry.id} className={entry.level === 3 ? 'ml-4' : ''}>
                    <a
                      href={`#${entry.id}`}
                      className={`block py-0.5 ${
                        entry.level === 2
                          ? 'text-indigo-400 font-medium'
                          : 'text-gray-300 text-sm'
                      } hover:text-indigo-300`}
                    >
                      {entry.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div ref={contentRef}>
            <MarkdownContent components={headingComponents}>{markdown}</MarkdownContent>
          </div>
        </>
      )}
    </div>
  )
}
