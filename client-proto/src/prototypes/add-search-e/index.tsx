import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────

type MediaType = 'movie' | 'tv'
type Rating = -2 | -1 | 0 | 1 | 2 | null

interface RatedItem {
  id: number
  type: MediaType
  title: string
  year: number
  rating: Rating
  seen: boolean
  again: boolean
}

interface CatalogItem {
  id: number
  type: MediaType
  title: string
  year: number
}

interface TmdbItem {
  tmdbId: number
  type: MediaType
  title: string
  year: number
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_RATED_ITEMS: RatedItem[] = [
  { id: 1,  type: 'movie', title: 'Interstellar',   year: 2014, rating:  2,    seen: true,  again: true  },
  { id: 2,  type: 'movie', title: 'The Shining',    year: 1980, rating:  2,    seen: false, again: false },
  { id: 3,  type: 'tv',    title: 'Severance',      year: 2022, rating:  2,    seen: false, again: false },
  { id: 4,  type: 'tv',    title: 'The Last of Us', year: 2023, rating:  1,    seen: false, again: false },
  { id: 5,  type: 'tv',    title: 'The Bear',       year: 2022, rating:  1,    seen: true,  again: true  },
  { id: 6,  type: 'movie', title: 'Parasite',       year: 2019, rating:  1,    seen: true,  again: false },
  { id: 7,  type: 'movie', title: 'Dune: Part Two', year: 2024, rating:  0,    seen: false, again: false },
  { id: 8,  type: 'movie', title: 'Alien: Romulus', year: 2024, rating:  null, seen: false, again: false },
]

const CATALOG_ITEMS: CatalogItem[] = [
  { id: 20, type: 'movie', title: 'Dune',                              year: 2021 },
  { id: 21, type: 'tv',    title: 'House of the Dragon',               year: 2022 },
  { id: 22, type: 'movie', title: 'Everything Everywhere All at Once', year: 2022 },
  { id: 23, type: 'movie', title: 'The Northman',                      year: 2022 },
  { id: 24, type: 'tv',    title: 'The White Lotus',                   year: 2021 },
  { id: 25, type: 'movie', title: 'Past Lives',                        year: 2023 },
]

const TMDB_ITEMS: TmdbItem[] = [
  { tmdbId: 101, type: 'movie', title: 'Dune: Prophecy',   year: 2024 },
  { tmdbId: 102, type: 'movie', title: 'Dune (1984)',       year: 1984 },
  { tmdbId: 103, type: 'tv',    title: 'Children of Dune', year: 2003 },
  { tmdbId: 104, type: 'movie', title: 'Conclave',         year: 2024 },
  { tmdbId: 105, type: 'tv',    title: 'Shogun',           year: 2024 },
  { tmdbId: 106, type: 'movie', title: 'Nickel Boys',      year: 2024 },
  { tmdbId: 107, type: 'tv',    title: 'Disclaimer',       year: 2024 },
]

// ── Display helpers ───────────────────────────────────────────────────────────

const RLABEL: Record<number, string> = { '-2': '--', '-1': '-', 0: '0', 1: '+', 2: '++' }

const RBADGE: Record<number, string> = {
  '-2': 'bg-red-900/50 text-red-300 border-red-800',
  '-1': 'bg-orange-900/50 text-orange-300 border-orange-800',
  0:    'bg-gray-700 text-gray-400 border-gray-600',
  1:    'bg-lime-900/50 text-lime-300 border-lime-800',
  2:    'bg-green-900/50 text-green-300 border-green-800',
}

const VSEL: Record<number, string> = {
  '-2': 'bg-red-600 text-white',
  '-1': 'bg-orange-500 text-white',
  0:    'bg-gray-500 text-white',
  1:    'bg-lime-600 text-white',
  2:    'bg-green-700 text-white',
}

const VUNSEL = 'bg-gray-700 text-gray-300 hover:bg-gray-600'

// ── Component ─────────────────────────────────────────────────────────────────

export default function AddSearchEPrototype() {
  const navigate = useNavigate()

  // Ratings list state
  const [ratedItems, setRatedItems] = useState<RatedItem[]>(INITIAL_RATED_ITEMS)
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv]         = useState(true)
  const [showSeen, setShowSeen]     = useState(false)
  const [editId, setEditId]         = useState<number | null>(null)

  // Search panel state
  const [panelOpen, setPanelOpen]   = useState(false)
  const [query, setQuery]           = useState('')
  const [tmdbMode, setTmdbMode]     = useState(false)
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [justAddedIds, setJustAddedIds] = useState<Set<number | string>>(new Set())

  const inputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function applyRating(id: number, r: Rating) {
    setRatedItems(prev => prev.map(x => x.id === id ? { ...x, rating: r } : x))
    setEditId(null)
  }

  function openPanel() {
    setPanelOpen(true)
    setQuery('')
    setTmdbMode(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function closePanel() {
    setPanelOpen(false)
    setQuery('')
    setTmdbMode(false)
    setTmdbLoading(false)
  }

  function handleSearchTmdb() {
    setTmdbLoading(true)
    setTmdbMode(false)
    setTimeout(() => {
      setTmdbLoading(false)
      setTmdbMode(true)
    }, 600)
  }

  function handleBackToCatalog() {
    setTmdbMode(false)
  }

  function addItem(item: CatalogItem | TmdbItem, key: number | string) {
    const newId = typeof key === 'string' ? Date.now() : (item as CatalogItem).id
    const alreadyRated = ratedItems.some(r => r.title === item.title)
    if (alreadyRated) return

    const newRated: RatedItem = {
      id: newId,
      type: item.type,
      title: item.title,
      year: item.year,
      rating: null,
      seen: false,
      again: false,
    }
    setRatedItems(prev => [...prev, newRated])
    setJustAddedIds(prev => new Set([...prev, key]))
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const hiddenCount = ratedItems.filter(x => x.seen && !x.again).length

  const filteredItems = [...ratedItems]
    .filter(x => {
      if (!showMovies && x.type === 'movie') return false
      if (!showTv    && x.type === 'tv')    return false
      if (x.seen && !x.again && !showSeen) return false
      return true
    })
    .sort((a, b) => {
      const ra = a.rating ?? -99
      const rb = b.rating ?? -99
      return rb - ra
    })

  const q = query.toLowerCase().trim()

  // Local search: catalog items not already rated, filtered by query
  const localCatalogResults = q
    ? CATALOG_ITEMS.filter(c =>
        c.title.toLowerCase().includes(q) &&
        !ratedItems.some(r => r.title === c.title)
      )
    : []

  // Rated items that match the query (to show "Already in your ratings")
  const localRatedMatches = q
    ? ratedItems.filter(r => r.title.toLowerCase().includes(q))
    : []

  // TMDB results, annotated with whether they're in catalog
  const tmdbResults = q
    ? TMDB_ITEMS.filter(t => t.title.toLowerCase().includes(q))
    : TMDB_ITEMS

  const hasTmdbResults = tmdbResults.length > 0
  const hasLocalResults = localCatalogResults.length > 0 || localRatedMatches.length > 0

  // ── Bottom nav ────────────────────────────────────────────────────────────────

  const bottomNav = (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <button className="flex-1 py-3 text-xs font-medium text-violet-400">
        Ratings
      </button>
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">
        Lists
      </button>
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">
        People
      </button>
      <button
        onClick={() => navigate('/')}
        className="flex-1 py-3 text-xs font-medium text-gray-600"
      >
        ← Protos
      </button>
    </nav>
  )

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-gray-900 min-h-screen text-white"
      style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="px-4" style={{ paddingTop: 'calc(1.5rem + var(--sat, 0px))' }}>

        {/* Page header */}
        <h1 className="text-xl font-bold mb-3">Ratings</h1>

        {/* Filter bar row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Type filter pills */}
          <div className="flex gap-1.5">
            {([
              { label: 'Movies', active: showMovies, toggle: () => setShowMovies(v => !v) },
              { label: 'TV',     active: showTv,     toggle: () => setShowTv(v => !v)     },
            ] as const).map(chip => (
              <button
                key={chip.label}
                onClick={chip.toggle}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  chip.active
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Seen toggle */}
          <button
            onClick={() => setShowSeen(v => !v)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              showSeen
                ? 'bg-gray-600 border-gray-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}
          >
            Seen{!showSeen && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
          </button>

          <div className="flex-1" />

          {/* Add / Close button */}
          <button
            onClick={panelOpen ? closePanel : openPanel}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              panelOpen
                ? 'bg-gray-700 border-gray-600 text-gray-300'
                : 'bg-violet-600 border-violet-500 text-white'
            }`}
          >
            {panelOpen ? '✕ Close' : '+ Add'}
          </button>
        </div>

        {/* Inline search panel */}
        {panelOpen && (
          <div className="bg-gray-800 rounded-2xl p-3 mb-3">

            {/* Search input */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-2 mb-2">
              <span className="text-gray-400 text-sm select-none">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setTmdbMode(false)
                  setTmdbLoading(false)
                }}
                placeholder="Search titles..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
              />
              {query.length > 0 && (
                <button
                  onClick={() => { setQuery(''); setTmdbMode(false); setTmdbLoading(false) }}
                  className="text-gray-500 hover:text-gray-300 text-sm leading-none"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Results area */}
            <div className="max-h-48 overflow-y-auto">
              {query.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  Search your catalog or find new titles
                </p>
              ) : tmdbLoading ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  Searching TMDB...
                </p>
              ) : tmdbMode ? (
                /* TMDB results */
                <>
                  {hasTmdbResults ? (
                    <ul className="space-y-0.5">
                      {tmdbResults.map(t => {
                        const inCatalog = CATALOG_ITEMS.some(c => c.title === t.title)
                        const alreadyRated = ratedItems.some(r => r.title === t.title)
                        const key = `tmdb-${t.tmdbId}`
                        const justAdded = justAddedIds.has(key)
                        return (
                          <li
                            key={t.tmdbId}
                            className="flex items-center gap-2 py-1.5 border-b border-gray-700/50 last:border-0"
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              t.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                            }`}>
                              {t.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white leading-snug">
                                {t.title}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">
                                {t.year}
                              </span>
                              {inCatalog && (
                                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">
                                  In catalog
                                </span>
                              )}
                            </div>
                            {alreadyRated ? (
                              <span className="text-xs text-gray-500 shrink-0">
                                Already rated
                              </span>
                            ) : justAdded ? (
                              <span className="text-xs text-green-400 shrink-0">
                                ✓ Added
                              </span>
                            ) : (
                              <button
                                onClick={() => addItem(t, key)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-violet-400 hover:bg-gray-600 shrink-0 transition-colors"
                              >
                                + Rate
                              </button>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 text-center py-4">
                      No TMDB results for "{query}"
                    </p>
                  )}
                </>
              ) : (
                /* Local catalog results */
                <>
                  {!hasLocalResults && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      No local results for "{query}"
                    </p>
                  )}

                  {(localCatalogResults.length > 0 || localRatedMatches.length > 0) && (
                    <ul className="space-y-0.5">
                      {localCatalogResults.map(c => {
                        const key = c.id
                        const justAdded = justAddedIds.has(key)
                        return (
                          <li
                            key={c.id}
                            className="flex items-center gap-2 py-1.5 border-b border-gray-700/50 last:border-0"
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                              c.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                            }`}>
                              {c.type === 'movie' ? 'Movie' : 'TV'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white leading-snug">
                                {c.title}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">
                                {c.year}
                              </span>
                            </div>
                            {justAdded ? (
                              <span className="text-xs text-green-400 shrink-0">
                                ✓ Added
                              </span>
                            ) : (
                              <button
                                onClick={() => addItem(c, key)}
                                className="text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-violet-400 hover:bg-gray-600 shrink-0 transition-colors"
                              >
                                + Rate
                              </button>
                            )}
                          </li>
                        )
                      })}
                      {localRatedMatches.map(r => (
                        <li
                          key={r.id}
                          className="flex items-center gap-2 py-1.5 border-b border-gray-700/50 last:border-0"
                        >
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            r.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                          }`}>
                            {r.type === 'movie' ? 'Movie' : 'TV'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-white leading-snug">
                              {r.title}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              {r.year}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 shrink-0">
                            Already in your ratings
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* TMDB / Back to catalog button — shown when query is non-empty */}
            {query.length > 0 && !tmdbLoading && (
              <div className="mt-2 pt-2 border-t border-gray-700/50">
                {tmdbMode ? (
                  <button
                    onClick={handleBackToCatalog}
                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors rounded-xl bg-gray-700/50 hover:bg-gray-700"
                  >
                    ← Back to catalog results
                  </button>
                ) : (
                  <button
                    onClick={handleSearchTmdb}
                    className="w-full py-2 text-xs text-gray-400 hover:text-gray-200 transition-colors rounded-xl bg-gray-700/50 hover:bg-gray-700"
                  >
                    🌐 Search TMDB for "{query}"
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ratings list */}
        {filteredItems.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            Nothing to show. Try adjusting the filters.
          </p>
        )}

        <ul className="space-y-2 pb-4">
          {filteredItems.map(item => (
            <li key={item.id} className="bg-gray-800 rounded-2xl p-3">
              <div className="flex items-start gap-2">
                {/* Type badge */}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                  item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                }`}>
                  {item.type === 'movie' ? 'Movie' : 'TV'}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.title} ({item.year})
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {item.seen && (
                      <span className="text-xs text-gray-600">seen</span>
                    )}
                    {item.again && (
                      <span className="text-xs text-emerald-700">again</span>
                    )}
                  </div>
                </div>

                {/* Rating badge → expands to picker on tap */}
                {editId === item.id ? (
                  <div className="flex gap-0.5 shrink-0">
                    {([-2, -1, 0, 1, 2] as const).map(r => (
                      <button
                        key={r}
                        onClick={() => applyRating(item.id, r)}
                        className={`w-9 h-8 text-xs rounded-lg font-medium transition-colors ${
                          item.rating === r ? VSEL[r] : VUNSEL
                        }`}
                      >
                        {RLABEL[r]}
                      </button>
                    ))}
                    <button
                      onClick={() => setEditId(null)}
                      className="w-7 h-8 text-xs text-gray-600 hover:text-gray-400 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditId(item.id)}
                    title="Tap to rate"
                    className={`shrink-0 w-10 h-7 text-xs font-bold rounded-lg border transition-colors ${
                      item.rating != null ? RBADGE[item.rating] : 'bg-gray-700 text-gray-500 border-gray-600'
                    }`}
                  >
                    {item.rating != null ? RLABEL[item.rating] : '?'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {bottomNav}
    </div>
  )
}
