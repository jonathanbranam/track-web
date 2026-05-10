import { useEffect, useState } from 'react'
import { Badge } from '@repo/ui'
import type { TvSeries, CastPreview as CastPreviewData } from '../api'
import { CastPreview } from './CastPreview'

interface TvSeriesCardProps {
  series: TvSeries
  isExpanded: boolean
  onToggle: () => void
  castPreview?: CastPreviewData
  actions?: React.ReactNode
}

export function TvSeriesCard({ series, isExpanded, onToggle, castPreview, actions }: TvSeriesCardProps) {
  const [showFullCast, setShowFullCast] = useState(false)

  useEffect(() => {
    if (!isExpanded) setShowFullCast(false)
  }, [isExpanded])

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
              {castPreview && (
                <CastPreview
                  director={castPreview.director}
                  cast={castPreview.cast}
                  showFullCast={showFullCast}
                  onToggleFullCast={() => setShowFullCast(prev => !prev)}
                />
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
