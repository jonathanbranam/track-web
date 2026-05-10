import { Badge } from '@repo/ui'
import type { Movie } from '../api'

interface MovieCardProps {
  movie: Movie
  isExpanded: boolean
  onToggle: () => void
  actions?: React.ReactNode
}

export function MovieCard({ movie, isExpanded, onToggle, actions }: MovieCardProps) {
  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            className="font-semibold text-sm text-left w-full flex items-center gap-1"
            aria-expanded={isExpanded}
          >
            <span className="flex-1 min-w-0 truncate">
              {movie.title}{movie.releaseYear ? ` (${movie.releaseYear})` : ''}
            </span>
            <span className="text-gray-400 shrink-0 text-xs">{isExpanded ? '▴' : '▾'}</span>
          </button>
          {movie.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {movie.tags.map(t => (
                <Badge key={t.id} color="violet">{t.name}</Badge>
              ))}
            </div>
          )}
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {movie.description && <p className="text-xs text-gray-300">{movie.description}</p>}
              {movie.streaming && <p className="text-xs text-gray-500">{movie.streaming}</p>}
              {movie.runtimeMinutes != null && <p className="text-xs text-gray-500">{movie.runtimeMinutes} min</p>}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-col items-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
