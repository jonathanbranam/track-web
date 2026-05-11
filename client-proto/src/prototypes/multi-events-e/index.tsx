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

interface UserList {
  id: string
  name: string
}

const LISTS: UserList[] = [
  { id: 'l1', name: 'Watch Next' },
  { id: 'l2', name: 'Favorites' },
  { id: 'l3', name: 'Horror' },
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

const ALICE_VOTES: Record<number, number> = { 1: 2, 2: 1, 3: 0 }
const BOB_VOTES:   Record<number, number> = { 1: 1, 3: 2 }

export default function MultiEventsCombined() {
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

  type AddTargetType = 'Event' | 'List'
  const [addTargetType, setAddTargetType] = useState<AddTargetType>('Event')

  const [focusedEventId, setFocusedEventId] = useState<string>('e1')
  const focusedEvent = events.find(e => e.id === focusedEventId) ?? events[0] ?? null

  const [focusedListId, setFocusedListId] = useState<string>('l1')
  const focusedList = LISTS.find(l => l.id === focusedListId) ?? LISTS[0]

  const [eventCandidates, setEventCandidates] = useState<Record<string, number[]>>({
    e1: [1, 2, 3],
    e2: [3],
  })

  const [listMemberships, setListMemberships] = useState<Record<string, number[]>>({
    l1: [1, 3, 5],
    l2: [1, 2],
    l3: [],
  })

  const [myVotes, setMyVotes] = useState<Record<number, number>>({ 1: 2, 2: 2, 3: 2 })
  const [fromMyListOpen, setFromMyListOpen] = useState(false)
  const [bestPicksOpen, setBestPicksOpen] = useState(false)
  const [justAdded, setJustAdded] = useState<Set<number>>(new Set())

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
      return { ...prev, [eventId]: inEvent ? current.filter(id => id !== itemId) : [...current, itemId] }
    })
  }

  function isInList(itemId: number, listId: string) {
    return (listMemberships[listId] ?? []).includes(itemId)
  }

  function toggleList(itemId: number, listId: string) {
    setListMemberships(prev => {
      const current = prev[listId] ?? []
      const inList = current.includes(itemId)
      return { ...prev, [listId]: inList ? current.filter(id => id !== itemId) : [...current, itemId] }
    })
  }

  function addFromMyList(item: MediaItem) {
    const eventId = focusedEvent?.id ?? 'e1'
    if (!(eventCandidates[eventId] ?? []).includes(item.id)) {
      setEventCandidates(prev => ({ ...prev, [eventId]: [...(prev[eventId] ?? []), item.id] }))
      if (item.rating != null) setMyVotes(prev => ({ ...prev, [item.id]: item.rating as number }))
    }
    setJustAdded(prev => new Set([...prev, item.id]))
    setTimeout(() => setJustAdded(prev => { const s = new Set(prev); s.delete(item.id); return s }), 2000)
  }

  const filteredItems = [...items]
    .filter(x => {
      if (!showMovies && x.type === 'movie') return false
      if (!showTv    && x.type === 'tv')    return false
      if (x.seen && !x.again && !x.watching && !showSeen) return false
      return true
    })
    .sort((a, b) => {
      const aIn = addTargetType === 'Event' && focusedEvent
        ? isInEvent(a.id, focusedEvent.id) ? 1 : 0
        : isInList(a.id, focusedListId) ? 1 : 0
      const bIn = addTargetType === 'Event' && focusedEvent
        ? isInEvent(b.id, focusedEvent.id) ? 1 : 0
        : isInList(b.id, focusedListId) ? 1 : 0
      if (bIn !== aIn) return bIn - aIn
      return (b.rating ?? -99) - (a.rating ?? -99)
    })

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
            <div className="mb-4 space-y-2.5">
              <div className="flex items-center gap-2">
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

              {/* Add to [Event|List] [specific] */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-500 shrink-0">Add to</span>

                {/* First dropdown: Event | List */}
                <div className="relative">
                  <select
                    value={addTargetType}
                    onChange={e => setAddTargetType(e.target.value as AddTargetType)}
                    className="appearance-none bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-violet-600"
                  >
                    <option value="Event">Event</option>
                    <option value="List">List</option>
                  </select>
                  <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
                </div>

                {/* Second dropdown: specific event or list */}
                {addTargetType === 'Event' ? (
                  events.length === 0 ? (
                    <span className="text-xs text-gray-600 italic">No upcoming events</span>
                  ) : (
                    <div className="relative">
                      <select
                        value={focusedEventId}
                        onChange={e => setFocusedEventId(e.target.value)}
                        className="appearance-none bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-violet-600"
                      >
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>
                            {ev.name} · {ev.date} ({(eventCandidates[ev.id] ?? []).length} shows)
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
                    </div>
                  )
                ) : (
                  <div className="relative">
                    <select
                      value={focusedListId}
                      onChange={e => setFocusedListId(e.target.value)}
                      className="appearance-none bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-violet-600"
                    >
                      {LISTS.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({(listMemberships[l.id] ?? []).length} shows)
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">▾</span>
                  </div>
                )}
              </div>
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
              {filteredItems.map(item => {
                const inFocus = addTargetType === 'Event'
                  ? (focusedEvent ? isInEvent(item.id, focusedEvent.id) : false)
                  : isInList(item.id, focusedListId)
                return (
                  <li
                    key={item.id}
                    className={`rounded-2xl p-3 transition-colors ${
                      inFocus
                        ? 'bg-gray-800 ring-1 ring-violet-800/60'
                        : 'bg-gray-800'
                    }`}
                  >
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

                    {/* D: single toggle chip for the focused event or list */}
                    {editId !== item.id && (addTargetType === 'List' || focusedEvent) && (
                      <div className="mt-2">
                        {addTargetType === 'Event' && focusedEvent ? (() => {
                          const inEv = isInEvent(item.id, focusedEvent.id)
                          return (
                            <button
                              onClick={() => toggleEvent(item.id, focusedEvent.id)}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                inEv
                                  ? 'bg-violet-900/30 border-violet-700 text-violet-300 hover:bg-violet-900/50'
                                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
                              }`}
                            >
                              <span className={inEv ? 'text-violet-400' : 'text-gray-600'}>{inEv ? '●' : '○'}</span>
                              {focusedEvent.name}
                            </button>
                          )
                        })() : (() => {
                          const inL = isInList(item.id, focusedListId)
                          return (
                            <button
                              onClick={() => toggleList(item.id, focusedListId)}
                              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                inL
                                  ? 'bg-violet-900/30 border-violet-700 text-violet-300 hover:bg-violet-900/50'
                                  : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-400'
                              }`}
                            >
                              <span className={inL ? 'text-violet-400' : 'text-gray-600'}>{inL ? '●' : '○'}</span>
                              {focusedList?.name}
                            </button>
                          )
                        })()}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {bottomNav}
      </div>
    )
  }

  const activeEventId = focusedEvent?.id ?? 'e1'
  const activeEvent = focusedEvent ?? ALL_EVENTS[0]

  const eventCands = (eventCandidates[activeEventId] ?? [])
    .map(id => items.find(x => x.id === id))
    .filter(Boolean) as MediaItem[]

  const notInEvent = [...items]
    .filter(x => !(eventCandidates[activeEventId] ?? []).includes(x.id))
    .sort((a, b) => (b.rating ?? -99) - (a.rating ?? -99))

  const bestPicks = eventCands
    .map(item => ({
      ...item,
      me:    myVotes[item.id] ?? 0,
      alice: ALICE_VOTES[item.id] ?? 0,
      bob:   BOB_VOTES[item.id] ?? 0,
      total: (myVotes[item.id] ?? 0) + (ALICE_VOTES[item.id] ?? 0) + (BOB_VOTES[item.id] ?? 0),
    }))
    .sort((a, b) => b.total - a.total)

  return (
    <div
      className="bg-gray-900 min-h-screen text-white"
      style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="px-4 pt-6 space-y-4">

        {/* Event header */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h1 className="text-xl font-bold">{activeEvent.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeEvent.date}, 2026</p>
        </div>

        {/* Suggestions */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Suggestions</h2>
            <button
              onClick={() => setBestPicksOpen(true)}
              className="text-xs px-2.5 py-1 rounded-lg bg-violet-900/40 text-violet-300 hover:bg-violet-900/60 transition-colors"
            >
              Best Picks
            </button>
          </div>

          <ul className="space-y-3 mb-4">
            {eventCands.map(item => {
              const score = (myVotes[item.id] ?? 0) + (ALICE_VOTES[item.id] ?? 0) + (BOB_VOTES[item.id] ?? 0)
              return (
                <li key={item.id} className="bg-gray-700/50 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium">
                          {item.title}{item.year ? ` (${item.year})` : ''}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                        }`}>
                          {item.type === 'movie' ? 'Movie' : 'TV'}
                        </span>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${score > 0 ? 'text-violet-400' : score < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {score > 0 ? '+' : ''}{score}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {([-2, -1, 0, 1, 2] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setMyVotes(prev => ({ ...prev, [item.id]: v }))}
                        className={`flex-1 min-h-[36px] text-xs rounded-lg transition-colors ${
                          myVotes[item.id] === v ? VSEL[v] : VUNSEL
                        }`}
                      >
                        {RLABEL[v]}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
            {eventCands.length === 0 && (
              <p className="text-sm text-gray-600 py-1">No suggestions yet — add from My List.</p>
            )}
          </ul>

          {/* From My List panel */}
          <button
            onClick={() => setFromMyListOpen(v => !v)}
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            {fromMyListOpen ? '▲ Hide' : '▼ Add From My Ratings'}
          </button>

          {fromMyListOpen && (
            <div className="mt-3 space-y-0.5">
              {notInEvent.slice(0, 7).map(item => (
                <div key={item.id} className="flex items-center gap-2 py-2 border-t border-gray-700/50">
                  <span className={`text-xs px-1 py-0.5 rounded shrink-0 ${
                    item.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                  }`}>
                    {item.type === 'movie' ? 'M' : 'TV'}
                  </span>
                  <span className="flex-1 text-sm truncate min-w-0">
                    {item.title}{item.year ? ` (${item.year})` : ''}
                  </span>
                  {item.rating != null ? (
                    <span className={`text-xs w-7 h-5 flex items-center justify-center rounded border shrink-0 ${RBADGE[item.rating]}`}>
                      {RLABEL[item.rating]}
                    </span>
                  ) : (
                    <span className="text-xs w-7 h-5 flex items-center justify-center rounded border shrink-0 bg-gray-700 text-gray-600 border-gray-600">
                      ?
                    </span>
                  )}
                  <button
                    onClick={() => {
                      addFromMyList(item)
                      if (notInEvent.filter(x => x.id !== item.id).length === 0) setFromMyListOpen(false)
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-700 text-violet-400 hover:bg-gray-600 shrink-0 transition-colors"
                  >
                    {justAdded.has(item.id) ? '✓' : 'Add'}
                  </button>
                </div>
              ))}
              {notInEvent.length === 0 && (
                <p className="text-xs text-gray-600 pt-2">Everything in your list is already suggested.</p>
              )}
            </div>
          )}
        </div>

        {/* People */}
        <div className="bg-gray-800 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">People</h2>
          {[
            { name: 'You',   att: 'yes'   },
            { name: 'Alice', att: 'yes'   },
            { name: 'Bob',   att: 'maybe' },
          ].map(p => (
            <div key={p.name} className="flex items-center justify-between py-1.5">
              <span className="text-sm">{p.name}</span>
              <div className="flex gap-1">
                {(['yes', 'no', 'maybe'] as const).map(a => (
                  <span
                    key={a}
                    className={`text-xs px-3 py-1.5 rounded-lg capitalize ${
                      p.att === a
                        ? a === 'yes'   ? 'bg-green-700 text-white'
                        : a === 'no'    ? 'bg-red-700 text-white'
                                        : 'bg-yellow-700 text-white'
                        : 'bg-gray-700 text-gray-500'
                    }`}
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Best Picks bottom sheet */}
      {bestPicksOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-20 flex items-end"
          onClick={() => setBestPicksOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-t-3xl w-full p-5 pb-10 max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold">Best Picks</h2>
              <button onClick={() => setBestPicksOpen(false)} className="text-gray-400 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-1">Sum of personal ratings for all attendees</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
              <span className="px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">You ✓</span>
              <span className="px-1.5 py-0.5 rounded bg-green-900/40 text-green-400">Alice ✓</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-900/40 text-yellow-400">Bob ?</span>
            </div>
            <ul className="space-y-3">
              {bestPicks.map((pick, i) => (
                <li key={pick.id} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-4 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{pick.title}</span>
                    <span className={`ml-1.5 text-xs px-1 py-0.5 rounded ${
                      pick.type === 'movie' ? 'bg-violet-900 text-violet-300' : 'bg-indigo-900 text-indigo-300'
                    }`}>
                      {pick.type === 'movie' ? 'M' : 'TV'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[pick.me, pick.alice, pick.bob].map((v, idx) => (
                      <span
                        key={idx}
                        className={`text-xs w-7 h-6 flex items-center justify-center rounded border ${
                          v !== 0 ? RBADGE[v] : 'bg-gray-700 border-gray-600 text-gray-600'
                        }`}
                      >
                        {v !== 0 ? RLABEL[v] : '·'}
                      </span>
                    ))}
                    <span className={`text-sm font-bold w-8 text-right ${
                      pick.total > 0 ? 'text-green-400' : pick.total < 0 ? 'text-red-400' : 'text-gray-500'
                    }`}>
                      {pick.total > 0 ? '+' : ''}{pick.total}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {bottomNav}
    </div>
  )
}
