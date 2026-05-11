import { useEffect, useRef, useState } from 'react'
import { api, type RatingItem } from '../api'

const RATING_LABELS: Record<number, string> = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' }

const RATING_BG: Record<number, string> = {
  '-2': 'bg-red-700 text-white',
  '-1': 'bg-orange-600 text-white',
  '0':  'bg-gray-500 text-white',
  '1':  'bg-lime-600 text-white',
  '2':  'bg-green-700 text-white',
}

interface CachedDetails {
  description: string | null
  runtimeMinutes?: number | null
  episodeRuntimeMinutes?: number | null
  seasonCount?: number | null
  director: string | null
  cast: Array<{ name: string; billingOrder: number }>
}

interface ToggleTarget {
  name: string
  isMember: boolean
  onToggle: () => void
}

interface MediaCardProps {
  item: RatingItem
  expandedId: number | null
  onExpandRating: (id: number | null) => void
  onRatingChange: (item: RatingItem, rating: number) => void
  detailsKey: string | null
  onExpandDetails: (key: string | null) => void
  toggleTarget?: ToggleTarget
}

export function MediaCard({ item, expandedId, onExpandRating, onRatingChange, detailsKey, onExpandDetails, toggleTarget }: MediaCardProps) {
  const isRatingExpanded = expandedId === item.id
  const itemKey = `${item.mediaType}-${item.id}`
  const showDetails = detailsKey === itemKey
  const ratingValues = [-2, -1, 0, 1, 2]

  const [showFullCast, setShowFullCast] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const detailsCache = useRef<CachedDetails | null>(null)

  useEffect(() => {
    if (!showDetails) setShowFullCast(false)
  }, [showDetails])

  async function handleToggleDetails() {
    const next = !showDetails
    onExpandDetails(next ? itemKey : null)
    if (next && detailsCache.current === null && !detailsLoading) {
      setDetailsLoading(true)
      try {
        if (item.mediaType === 'movie') {
          const data = await api.movies.get(item.id)
          detailsCache.current = {
            description: data.description,
            runtimeMinutes: data.runtimeMinutes,
            director: data.director,
            cast: data.cast,
          }
        } else {
          const data = await api.tv.get(item.id)
          detailsCache.current = {
            description: data.description,
            episodeRuntimeMinutes: data.episodeRuntimeMinutes,
            seasonCount: data.seasonCount,
            director: data.director,
            cast: data.cast,
          }
        }
      } finally {
        setDetailsLoading(false)
      }
    }
  }

  async function handleRatingSelect(rating: number) {
    if (item.mediaType === 'movie') {
      const state = item.seen ? (item.again ? 'would_watch_again' : 'watched') : 'unseen'
      await api.movies.watchlist.upsert(item.id, { state, rating })
    } else {
      const state = item.watching ? 'watching' : item.seen ? (item.again ? 'would_watch_again' : 'watched') : 'unseen'
      await api.tv.watchlist.upsert(item.id, { state, rating })
    }
    onExpandRating(null)
    onRatingChange(item, rating)
  }

  const details = detailsCache.current
  const hasCast = details && (details.director != null || details.cast.length > 0)

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={handleToggleDetails}
            className="font-semibold text-sm text-left w-full truncate"
            aria-expanded={showDetails}
          >
            {item.title}{item.year ? ` (${item.year})` : ''}
          </button>
          {item.streaming && (
            <p className="text-xs text-gray-500 mt-0.5">{item.streaming}</p>
          )}
          {toggleTarget && (
            <button
              type="button"
              onClick={toggleTarget.onToggle}
              className={`mt-1.5 text-xs flex items-center gap-1 transition-colors ${
                toggleTarget.isMember ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span>{toggleTarget.isMember ? '●' : '○'}</span>
              <span className="truncate max-w-[140px]">{toggleTarget.name}</span>
            </button>
          )}
        </div>

        {/* Rating button */}
        <div className="shrink-0">
          {isRatingExpanded ? (
            <div className="flex items-center gap-1">
              {ratingValues.map(v => (
                <button
                  key={v}
                  onClick={() => handleRatingSelect(v)}
                  className={`w-9 h-7 text-xs rounded-lg transition-colors ${
                    item.rating === v
                      ? RATING_BG[v]
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {RATING_LABELS[v]}
                </button>
              ))}
              <button
                onClick={() => onExpandRating(null)}
                className="w-7 h-7 text-xs rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => onExpandRating(isRatingExpanded ? null : item.id)}
              className={`w-10 h-7 text-xs rounded-lg transition-colors ${
                item.rating !== null
                  ? RATING_BG[item.rating]
                  : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
              }`}
              aria-label="Edit rating"
            >
              {item.rating !== null ? RATING_LABELS[item.rating] : '?'}
            </button>
          )}
        </div>
      </div>

      {/* Details disclosure */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
          {detailsLoading && <p className="text-xs text-gray-500">Loading…</p>}
          {details && (
            <>
              {details.description && <p className="text-xs text-gray-300">{details.description}</p>}
              {details.runtimeMinutes != null && (
                <p className="text-xs text-gray-500">{details.runtimeMinutes} min</p>
              )}
              {details.episodeRuntimeMinutes != null && (
                <p className="text-xs text-gray-500">~{details.episodeRuntimeMinutes} min/ep</p>
              )}
              {details.seasonCount != null && (
                <p className="text-xs text-gray-500">
                  {details.seasonCount} season{details.seasonCount !== 1 ? 's' : ''}
                </p>
              )}
              {hasCast && (
                <div className="pt-1 space-y-0.5">
                  {details.director != null && (
                    <p className="text-xs text-gray-400">
                      <span className="text-gray-500">Director: </span>{details.director}
                    </p>
                  )}
                  {(showFullCast ? details.cast : details.cast.slice(0, 3)).map(m => (
                    <p key={m.billingOrder} className="text-xs text-gray-400">{m.name}</p>
                  ))}
                  {details.cast.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowFullCast(prev => !prev)}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors pt-0.5"
                    >
                      {showFullCast ? 'Hide cast' : 'Full cast'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
