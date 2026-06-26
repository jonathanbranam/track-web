import type { ContentMap } from './contentTypes'

interface Props {
  maps: ContentMap[]
  loading: boolean
  error: string | null
  // True while the chosen map is being loaded into the store before play starts.
  starting: boolean
  onSelect: (mapId: string) => void
  onRetry: () => void
}

// The start-of-game map picker: a modal overlay shown before any board is mounted.
// The player chooses one of the region's saved maps; selecting it loads that map
// into the content store and starts the match. Purely presentational — the parent
// (DungeonTacticsGame) owns the map list and the load/start flow.
export default function MapSelectDialog({ maps, loading, error, starting, onSelect, onRetry }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-950/80 p-4">
      <div className="flex max-h-[85%] w-full max-w-sm flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl">
        <div className="border-b border-gray-700 px-4 py-3">
          <h2 className="text-base font-semibold">Choose a map</h2>
          <p className="mt-0.5 text-xs text-gray-400">Pick a saved map to start the match.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <div className="py-6 text-center text-sm text-gray-400">Loading maps…</div>}

          {!loading && error && (
            <div className="py-2 text-sm">
              <div className="mb-2 text-red-300">{error}</div>
              <button
                type="button"
                onClick={onRetry}
                className="rounded bg-gray-700 px-3 py-1 text-sm hover:bg-gray-600"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && maps.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">No saved maps found.</div>
          )}

          {!loading && !error && maps.length > 0 && (
            <ul className="flex flex-col gap-1">
              {maps.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(m.id)}
                    disabled={starting}
                    className="flex w-full items-center justify-between rounded bg-gray-800 px-3 py-2 text-left hover:bg-indigo-600 disabled:opacity-50"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.size.cols}×{m.size.rows}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {starting && (
          <div className="border-t border-gray-700 px-4 py-2 text-center text-xs text-gray-400">
            Starting match…
          </div>
        )}
      </div>
    </div>
  )
}
