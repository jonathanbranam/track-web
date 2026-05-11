import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@repo/ui'
import { api, type RatingItem, type WatchEvent, type WatchEventCandidate } from '../api'
import { MediaCard } from '../components/MediaCard'

type SubTab = 'ratings' | 'lists'

export function RatingsPage() {
  const [items, setItems] = useState<RatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [subTab, setSubTab] = useState<SubTab>('ratings')

  // Filter state
  const [showMovies, setShowMovies] = useState(true)
  const [showTv, setShowTv] = useState(true)
  const [showSeen, setShowSeen] = useState(false)

  // Add-to state
  const [targetType, setTargetType] = useState<'event' | 'list'>('event')
  const [events, setEvents] = useState<WatchEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [eventCandidates, setEventCandidates] = useState<WatchEventCandidate[]>([])

  // Rating expansion
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // Details expansion (only one card open at a time)
  const [detailsKey, setDetailsKey] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.ratings.list(),
      api.events.list({ filter: 'active' }),
    ]).then(([ratingItems, activeEvents]) => {
      setItems(ratingItems)
      setEvents(activeEvents)
      if (activeEvents.length > 0) setSelectedEventId(activeEvents[0].id)
    }).finally(() => setLoading(false))
  }, [])

  // Load candidates for the selected event
  useEffect(() => {
    if (!selectedEventId) { setEventCandidates([]); return }
    api.events.get(selectedEventId).then(d => setEventCandidates(d.candidates)).catch(() => {})
  }, [selectedEventId])

  function isHiddenBySeen(item: RatingItem): boolean {
    return item.seen && !item.again && !item.watching
  }

  const hiddenSeenCount = items.filter(isHiddenBySeen).length

  const filtered = items.filter(item => {
    if (!showMovies && item.mediaType === 'movie') return false
    if (!showTv && item.mediaType === 'tv') return false
    if (!showSeen && isHiddenBySeen(item)) return false
    return true
  })

  function isMemberOfEvent(item: RatingItem): boolean {
    if (!selectedEventId) return false
    return eventCandidates.some(c =>
      (item.mediaType === 'movie' && c.movieId === item.id) ||
      (item.mediaType === 'tv' && c.seriesId === item.id)
    )
  }

  async function handleToggleEventMembership(item: RatingItem) {
    if (!selectedEventId) return
    const isMember = isMemberOfEvent(item)
    if (isMember) {
      const candidate = eventCandidates.find(c =>
        (item.mediaType === 'movie' && c.movieId === item.id) ||
        (item.mediaType === 'tv' && c.seriesId === item.id)
      )
      if (candidate) {
        await api.events.removeCandidate(selectedEventId, candidate.id).catch(() => {})
      }
    } else {
      await api.events.addCandidate(selectedEventId, {
        movieId: item.mediaType === 'movie' ? item.id : undefined,
        seriesId: item.mediaType === 'tv' ? item.id : undefined,
      }).catch(() => {})
    }
    const d = await api.events.get(selectedEventId)
    setEventCandidates(d.candidates)
  }

  async function handleRatingChange(item: RatingItem, rating: number) {
    setItems(prev => prev.map(i => i.id === item.id && i.mediaType === item.mediaType ? { ...i, rating } : i))
  }

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const pillBase = 'px-3 py-1 rounded-full text-xs font-medium transition-colors border'
  const pillActive = 'bg-violet-600 border-violet-600 text-white'
  const pillInactive = 'bg-transparent border-gray-600 text-gray-400 hover:border-gray-400'

  if (loading) return <LoadingSpinner className="h-64" />

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-bold mb-3">Ratings</h1>

      {/* Sub-tabs */}
      <div className="flex gap-4 mb-4 border-b border-gray-700 pb-0">
        {(['ratings', 'lists'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setSubTab(tab)}
            className={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              subTab === tab
                ? 'text-violet-400 border-violet-400'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab === 'ratings' ? 'Ratings' : 'My Lists'}
          </button>
        ))}
      </div>

      {subTab === 'lists' && (
        <p className="text-sm text-gray-500 py-8 text-center">My Lists — coming soon</p>
      )}

      {subTab === 'ratings' && (
        <>
          {/* Add-to row */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-gray-400 shrink-0">Add to</span>
            <select
              value={targetType}
              onChange={e => setTargetType(e.target.value as 'event' | 'list')}
              className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="event">Event</option>
              <option value="list">List</option>
            </select>
            {targetType === 'event' && (
              events.length === 0 ? (
                <span className="text-xs text-gray-500 italic">No upcoming events</span>
              ) : (
                <select
                  value={selectedEventId ?? ''}
                  onChange={e => setSelectedEventId(parseInt(e.target.value, 10))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 flex-1 min-w-0 truncate"
                >
                  {events.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.title} ({eventCandidates.length > 0 && selectedEventId === e.id ? eventCandidates.length : 0} shows)
                    </option>
                  ))}
                </select>
              )
            )}
            {targetType === 'list' && (
              <span className="text-xs text-gray-500 italic">Lists coming soon</span>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setShowMovies(v => !v)} className={`${pillBase} ${showMovies ? pillActive : pillInactive}`}>
              Movies
            </button>
            <button onClick={() => setShowTv(v => !v)} className={`${pillBase} ${showTv ? pillActive : pillInactive}`}>
              TV
            </button>
            <div className="flex-1" />
            <button onClick={() => setShowSeen(v => !v)} className={`${pillBase} ${showSeen ? pillActive : pillInactive}`}>
              Seen{!showSeen && hiddenSeenCount > 0 ? ` (${hiddenSeenCount})` : ''}
            </button>
          </div>

          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">No items match the current filters.</p>
          )}

          <ul className="space-y-3 pb-6">
            {filtered.map(item => {
              const key = `${item.mediaType}-${item.id}`
              const showToggle = targetType === 'event' && selectedEventId !== null && events.length > 0 && selectedEvent
              return (
                <li key={key}>
                  <MediaCard
                    item={item}
                    expandedId={expandedId}
                    onExpandRating={id => setExpandedId(id)}
                    onRatingChange={handleRatingChange}
                    detailsKey={detailsKey}
                    onExpandDetails={setDetailsKey}
                    toggleTarget={showToggle ? {
                      name: selectedEvent.title,
                      isMember: isMemberOfEvent(item),
                      onToggle: () => handleToggleEventMembership(item),
                    } : undefined}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
