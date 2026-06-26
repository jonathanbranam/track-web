import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ContentMap, ContentRegion, ContentTree } from '../games/dungeon-tactics-solo/contentTypes'
import { GAME_SLUG } from '../games/dungeon-tactics-solo/contentStore'
import { blankMap } from '../games/dungeon-tactics-solo/editorModel'
import { fetchDefaultContent, fetchRegionWithMaps, createMap, deleteMap } from '../api'

const HUB = '/studio/dungeon-tactics'

// The studio map list for the seeded region: opens, creates, and deletes maps.
// New builds a blank map, persists it through the write API, and routes to its
// editor; Delete surfaces the API's last-map rejection rather than removing it.
export default function MapListPage() {
  const navigate = useNavigate()
  const [region, setRegion] = useState<ContentRegion | null>(null)
  const [maps, setMaps] = useState<ContentMap[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (regionId: string) => {
    const { maps: list } = await fetchRegionWithMaps<ContentRegion, ContentMap>(GAME_SLUG, regionId)
    setMaps([...list].sort((a, b) => a.order - b.order))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const tree = await fetchDefaultContent<ContentTree>(GAME_SLUG)
        if (cancelled) return
        setRegion(tree.region)
        await load(tree.region.id)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load maps')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [load])

  const onNew = useCallback(async () => {
    if (!region || busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await createMap<ContentMap>(GAME_SLUG, region.id, blankMap(region))
      navigate(`${HUB}/maps/${created.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create map')
      setBusy(false)
    }
  }, [region, busy, navigate])

  const onDelete = useCallback(async (id: string) => {
    if (!region || busy) return
    setBusy(true)
    setError(null)
    try {
      await deleteMap(GAME_SLUG, id)
      await load(region.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete map')
    } finally {
      setBusy(false)
    }
  }, [region, busy, load])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        <Link to={HUB} className="text-sm text-indigo-400 hover:text-indigo-300">
          &larr; Dungeon Tactics
        </Link>
        <span className="text-sm font-semibold">Maps</span>
        <span className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-3">
          {error && (
            <div className="rounded bg-red-900/40 px-3 py-2 text-sm text-red-200 ring-1 ring-red-800">{error}</div>
          )}

          <button
            onClick={onNew}
            disabled={!region || busy}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-left font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
          >
            + New map
          </button>

          {loading && <div className="text-sm text-gray-400">Loading…</div>}

          {!loading && maps.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl bg-gray-800 px-4 py-3">
              <button
                onClick={() => navigate(`${HUB}/maps/${m.id}`)}
                className="flex-1 text-left hover:text-indigo-300"
              >
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-gray-400">{m.size.cols}×{m.size.rows}</div>
              </button>
              <button
                onClick={() => onDelete(m.id)}
                disabled={busy}
                className="rounded px-2 py-1 text-sm text-red-300 hover:bg-red-900/40 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          ))}

          {!loading && maps.length === 0 && !error && (
            <div className="text-sm text-gray-400">No maps yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
