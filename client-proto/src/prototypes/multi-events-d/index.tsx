import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Screen = 'list' | 'event'
type MediaType = 'movie' | 'tv'
type Rating = -2 | -1 | 0 | 1 | 2 | null
type ListTab = 'ratings' | 'lists'

interface MediaItem {
  id: number
  type: MediaType
  title: string
  year: number | null
  streaming: string | null
  rating: Rating
  seen: boolean
  again: boolean
  watching?: boolean
  season?: number
  episode?: number
}

interface WatchEvent {
  id: string
  name: string
  date: string
}

const ALL_EVENTS: WatchEvent[] = [
  { id: 'e1', name: 'Movie Night', date: 'Jun 15' },
  { id: 'e2', name: 'Game Day',    date: 'Jun 22' },
]

const INITIAL_ITEMS: MediaItem[] = [
  { id: 1,  type: 'movie', title: 'Interstellar',    year: 2014, streaming: 'Max',        rating:  2, seen: true,  again: true  },
  { id: 2,  type: 'movie', title: 'The Shining',     year: 1980, streaming: null,          rating:  2, seen: false, again: false },
  { id: 3,  type: 'tv',    title: 'Severance',       year: 2022, streaming: 'Apple TV+',   rating:  2, seen: false, again: false },
  { id: 4,  type: 'tv',    title: 'The Last of Us',  year: 2023, streaming: 'Max',         rating:  1, seen: false, again: false, watching: true, season: 1, episode: 4 },
  { id: 5,  type: 'tv',    title: 'The Bear',        year: 2022, streaming: 'Hulu',        rating:  1, seen: true,  again: true  },
  { id: 6,  type: 'movie', title: 'Parasite',        year: 2019, streaming: 'Max',         rating:  1, seen: true,  again: false },
  { id: 7,  type: 'movie', title: 'Dune: Part Two',  year: 2024, streaming: 'Max',         rating:  0, seen: false, again: false },
  { id: 8,  type: 'movie', title: 'Alien: Romulus',  year: 2024, streaming: 'Hulu',        rating: null, seen: false, again: false },
]

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

export default function MultiEventsToggles() {
  const navigate = useNavigate()
  const [screen, setScreen] = useState<Screen>('list')
  const [items, setItems] = useState<MediaItem[]>(INITIAL_ITEMS)
  const [numEvents, setNumEvents] = useState<0 | 1 | 2>(2)
  const events = ALL_EVENTS.slice(0, numEvents)

  const [listTab, setListTab] = useState<ListTab>('ratings')
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv] = useState(true)
  const [showSeen, setShowSeen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  const [eventCandidates, setEventCandidates] = useState<Record<string, number[]>>({
    e1: [1, 2, 3],
    e2: [3],
  })

  function applyRating(id: number, r: Rating) {
    setItems(prev => prev.map(x => x.id === id ? { ...x, rating: r } : x))
    setEditId(null)
  }

  function isInEvent(itemId: number, eventId: string) {
    return (eventCandidates[eventId] ?? []).includes(itemId)
  }

  function toggleEvent(itemId: number, eventId: string) {
    setEventCandidates(prev => {
      const current = prev[eventId] ?? []
      const inEvent = current.includes(itemId)
      return {
        ...prev,
        [eventId]: inEvent ? current.filter(id => id !== itemId) : [...current, itemId],
      }
    })
  }

  const filteredItems = [...items]
    .filter(x => {
      if (!showMovies && x.type === 'movie') return false
      if (!showTv    && x.type === 'tv')    return false
      if (x.seen && !x.again && !x.watching && !showSeen) return false
      return true
    })
    .sort((a, b) => (b.rating ?? -99) - (a.rating ?? -99))

  const bottomNav = (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex z-10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {([
        { id: 'event' as Screen, label: 'Events' },
        { id: 'list'  as Screen, label: 'My List' },
      ] as const).map(tab => (
        <button
          key={tab.id}
          onClick={() => setScreen(tab.id)}
          className={`flex-1 py-3 text-xs font-medium transition-colors ${screen === tab.id ? 'text-violet-400' : 'text-gray-500'}`}
        >
          {tab.label}
        </button>
      ))}
      <button className="flex-1 py-3 text-xs font-medium text-gray-500">People</button>
      <button onClick={() => navigate('/')} className="flex-1 py-3 text-xs font-medium text-gray-600">← Protos</button>
    </nav>
  )

  if (screen === 'list') {
    const hiddenCount = items.filter(x => x.seen && !x.again && !x.watching).length
    return (
      <div
        className="bg-gray-900 min-h-screen text-white"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="px-4 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">My List</h1>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Events:</span>
              {([0, 1, 2] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setNumEvents(n)}
                  className={`text-xs w-6 h-5 rounded ${numEvents === n ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-4">
            {(['ratings', 'lists'] as const).map(t => (
              <button
                key={t}
                onClick={() => setListTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${listTab === t ? 'bg-violet-600 text-white' : 'text-gray-400'}`}
              >
                {t === 'ratings' ? 'Ratings' : 'My Lists'}
              </button>
            ))}
          </div>

          {listTab === 'ratings' && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1.5">
                {([
                  { label: 'Movies', active: showMovies, toggle: () => setShowMovies(v => !v) },
                  { label: 'TV',     active: showTv,     toggle: () => setShowTv(v => !v) },
                ] as const).map(chip => (
                  <button
                    key={chip.label}
                    onClick={chip.toggle}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      chip.active ? 'bg-violet-600 border-violet-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setShowSeen(v => !v)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  showSeen ? 'bg-gray-600 border-gray-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}
              >
                Seen{!showSeen && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
              </button>
            </div>
          )}
        </div>

        <div className="px-4">
          {listTab === 'lists' ? (
            <div className="text-center py-20">
              <div className="text-3xl mb-3">📋</div>
              <p className="text-gray-500 font-medium">My Lists</p>
              <p className="text-gray-600 text-sm mt-1">Coming soon</p>
            </div>
          ) : (
            <ul className="space-y-2 pb-4">
              {filteredItems.map(item => (
                <li key={item.id} className="bg-gray-800 rounded-2xl p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium leading-snug">
                          {item.title}{item.year ? ` (${item.year})` : ''}
                        </p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                        }`}>
                          {item.type === 'movie' ? 'Movie' : 'TV'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        {item.streaming && <span className="text-xs text-gray-500">{item.streaming}</span>}
                        {item.watching && <span className="text-xs text-violet-500">Watching · S{item.season}E{item.episode}</span>}
                        {item.seen && !item.watching && <span className="text-xs text-gray-600">seen</span>}
                        {item.again && <span className="text-xs text-emerald-700">again</span>}
                      </div>
                    </div>
                    {editId !== item.id && (
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

                  {editId === item.id && (
                    <div className="mt-2 flex gap-1">
                      {([-2, -1, 0, 1, 2] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => applyRating(item.id, r)}
                          className={`flex-1 h-9 text-xs rounded-lg font-medium transition-colors ${
                            item.rating === r ? VSEL[r] : VUNSEL
                          }`}
                        >
                          {RLABEL[r]}
                        </button>
                      ))}
                      <button
                        onClick={() => setEditId(null)}
                        className="w-9 h-9 text-xs text-gray-500 hover:text-gray-300 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {editId !== item.id && events.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {events.map(ev => {
                        const inEv = isInEvent(item.id, ev.id)
                        return (
                          <button
                            key={ev.id}
                            onClick={() => toggleEvent(item.id, ev.id)}
                            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                              inEv
                                ? 'bg-violet-900/30 border-violet-700 text-violet-300 hover:bg-violet-900/50'
                                : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
                            }`}
                          >
                            <span className={inEv ? 'text-violet-400' : 'text-gray-600'}>
                              {inEv ? '●' : '○'}
                            </span>
                            {ev.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {bottomNav}
      </div>
    )
  }

  const cands = (eventCandidates['e1'] ?? []).map(id => items.find(x => x.id === id)).filter(Boolean) as MediaItem[]
  return (
    <div
      className="bg-gray-900 min-h-screen text-white"
      style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="px-4 pt-6 space-y-4">
        <div className="bg-gray-800 rounded-2xl p-4">
          <h1 className="text-xl font-bold">Movie Night</h1>
          <p className="text-sm text-gray-400 mt-0.5">Jun 15, 2026</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Suggestions</h2>
          <ul className="space-y-2">
            {cands.map(item => (
              <li key={item.id} className="bg-gray-700/50 rounded-xl p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}{item.year ? ` (${item.year})` : ''}</p>
                </div>
                {item.rating != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-bold ${RBADGE[item.rating]}`}>
                    {RLABEL[item.rating]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {bottomNav}
    </div>
  )
}
