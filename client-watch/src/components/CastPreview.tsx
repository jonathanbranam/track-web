interface CastPreviewProps {
  director: string | null
  cast: { name: string; billingOrder: number }[]
  showFullCast: boolean
  onToggleFullCast: () => void
}

export function CastPreview({ director, cast, showFullCast, onToggleFullCast }: CastPreviewProps) {
  if (director == null && cast.length === 0) return null
  return (
    <div className="pt-1 space-y-0.5">
      {director != null && (
        <p className="text-xs text-gray-400">
          <span className="text-gray-500">Director: </span>{director}
        </p>
      )}
      {(showFullCast ? cast : cast.slice(0, 3)).map(m => (
        <p key={m.billingOrder} className="text-xs text-gray-400">{m.name}</p>
      ))}
      {cast.length > 0 && (
        <button
          type="button"
          onClick={onToggleFullCast}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors pt-0.5"
        >
          {showFullCast ? 'Hide cast' : 'Full cast'}
        </button>
      )}
    </div>
  )
}
