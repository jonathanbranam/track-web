import { Badge } from '@repo/ui'
import type { TvSeries } from '../api'

interface TvSeriesCardProps {
  series: TvSeries
  isExpanded: boolean
  onToggle: () => void
  actions?: React.ReactNode
}

export function TvSeriesCard({ series, isExpanded, onToggle, actions }: TvSeriesCardProps) {
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
              {series.title}{series.releaseYear ? ` (${series.releaseYear})` : ''}
            </span>
            <span className="text-gray-400 shrink-0 text-xs">{isExpanded ? '▴' : '▾'}</span>
          </button>
          {series.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {series.tags.map(t => (
                <Badge key={t.id} color="violet">{t.name}</Badge>
              ))}
            </div>
          )}
          {isExpanded && (
            <div className="mt-2 space-y-1">
              {series.description && <p className="text-xs text-gray-300">{series.description}</p>}
              {series.streaming && <p className="text-xs text-gray-500">{series.streaming}</p>}
              {series.episodeRuntimeMinutes != null && (
                <p className="text-xs text-gray-500">~{series.episodeRuntimeMinutes} min/ep</p>
              )}
              {series.seasonCount != null && (
                <p className="text-xs text-gray-500">
                  {series.seasonCount} season{series.seasonCount !== 1 ? 's' : ''}
                </p>
              )}
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
