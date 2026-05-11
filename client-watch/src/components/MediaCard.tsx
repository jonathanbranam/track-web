import { api, type RatingItem } from '../api'

const RATING_LABELS: Record<number, string> = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' }

const RATING_BG: Record<number, string> = {
  '-2': 'bg-red-700 text-white',
  '-1': 'bg-orange-600 text-white',
  '0':  'bg-gray-500 text-white',
  '1':  'bg-lime-600 text-white',
  '2':  'bg-green-700 text-white',
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
  toggleTarget?: ToggleTarget
}

export function MediaCard({ item, expandedId, onExpandRating, onRatingChange, toggleTarget }: MediaCardProps) {
  const isExpanded = expandedId === item.id
  const ratingValues = [-2, -1, 0, 1, 2]

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

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {item.title}{item.year ? ` (${item.year})` : ''}
          </p>
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
          {isExpanded ? (
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
              onClick={() => onExpandRating(isExpanded ? null : item.id)}
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
    </div>
  )
}
