import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as Phaser from 'phaser'
import PhaserGame from '../games/PhaserGame'
import EditorScene from '../games/dungeon-tactics-solo/EditorScene'
import type { TilePointerHandler } from '../games/dungeon-tactics-solo/EditorScene'
import type { ContentMap, ContentRegion, ContentEncounter } from '../games/dungeon-tactics-solo/contentTypes'
import { GAME_SLUG } from '../games/dungeon-tactics-solo/contentStore'
import { applyTool, resizeMap, validateMap } from '../games/dungeon-tactics-solo/editorModel'
import type { Brush, Tool } from '../games/dungeon-tactics-solo/editorModel'
import { fetchMapWithEncounters, fetchRegionWithMaps, saveMap } from '../api'
import MapEditorHud from './MapEditorHud'

const HUB = '/studio/dungeon-tactics'

// The studio map editor for one map. React owns the authoritative `ContentMap`,
// the active tool, and the brush; the Phaser `EditorScene` is a dumb renderer that
// reports tile pointer events. Each tile event runs the pure `applyTool`, the next
// map is stored in React state and pushed to the scene, and `validateMap` gates
// Save. Save round-trips through the write API (the server is the authority) and
// reloads the stored map.
export default function MapEditorPage() {
  const { mapId = '' } = useParams()
  const navigate = useNavigate()

  const [region, setRegion] = useState<ContentRegion | null>(null)
  const [map, setMap] = useState<ContentMap | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [tool, setTool] = useState<Tool>('pan')
  const [brush, setBrush] = useState<Brush>({ terrain: '', objectKind: 'power-center', objectHp: 3 })

  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Refs mirror the latest values so the Phaser pointer handler (wired once at
  // game-ready) never reads stale state. Synced during render — not in an effect —
  // because the child PhaserGame's mount effect (which seeds the scene registry
  // from `mapRef`) runs before any parent effect would.
  const mapRef = useRef<ContentMap | null>(null)
  const toolRef = useRef(tool)
  const brushRef = useRef(brush)
  const gameRef = useRef<Phaser.Game | null>(null)
  mapRef.current = map
  toolRef.current = tool
  brushRef.current = brush

  const scene = useCallback(
    (): EditorScene | null => (gameRef.current?.scene.getScene('EditorScene') as EditorScene) ?? null,
    [],
  )

  // ─── Load map + its region ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setMap(null)
    setRegion(null)
    setLoadError(null)
    ;(async () => {
      try {
        const { map: loaded } = await fetchMapWithEncounters<ContentMap, ContentEncounter>(GAME_SLUG, mapId)
        const { region: reg } = await fetchRegionWithMaps<ContentRegion, ContentMap>(GAME_SLUG, loaded.regionId)
        if (cancelled) return
        setRegion(reg)
        setMap(loaded)
        // Default the terrain brush to the region's first terrain.
        setBrush((b) => ({ ...b, terrain: b.terrain || reg.terrainTypes[0] || 'plains' }))
        setDirty(false)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load map')
      }
    })()
    return () => { cancelled = true }
  }, [mapId])

  const problems = useMemo(
    () => (map && region ? validateMap(map, region) : []),
    [map, region],
  )
  const canSave = dirty && !saving && problems.length === 0

  // Push validation flags to the scene whenever they change.
  useEffect(() => {
    const tiles = problems
      .filter((p) => p.tile)
      .map((p) => `${p.tile!.col},${p.tile!.row}`)
    scene()?.setProblemTiles(tiles)
  }, [problems, scene])

  // The Pan tool switches the canvas from painting to camera-panning.
  useEffect(() => {
    scene()?.setPanMode(tool === 'pan')
  }, [tool, scene])

  // ─── Phaser wiring ───────────────────────────────────────────────────────────

  const buildConfig = useCallback(
    (parent: HTMLElement): Phaser.Types.Core.GameConfig => ({
      type: Phaser.AUTO,
      parent,
      backgroundColor: '#111827',
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: EditorScene,
    }),
    [],
  )

  const onGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game
    // The pure tool application: mutate the React-owned map, push it to the scene,
    // and re-render the HUD. Reads refs so it stays current across renders.
    const handleTile: TilePointerHandler = (tile) => {
      const current = mapRef.current
      if (!current) return
      const next = applyTool(current, toolRef.current, brushRef.current, tile)
      if (next === current) return
      mapRef.current = next
      scene()?.setMap(next)
      setMap(next)
      setDirty(true)
    }
    game.registry.set('editorMap', mapRef.current)
    game.registry.set('onTilePointer', handleTile)
    // Seed the scene's pan mode from the current tool (Pan is the default), since
    // the setPanMode effect runs before the scene exists and won't re-fire.
    game.registry.set('editorPanMode', toolRef.current === 'pan')
  }, [scene])

  // ─── HUD actions ─────────────────────────────────────────────────────────────

  const onResize = useCallback((cols: number, rows: number) => {
    const current = mapRef.current
    if (!current || !region) return
    const { map: next, dropped } = resizeMap(current, cols, rows, region.terrainTypes[0])
    mapRef.current = next
    scene()?.setMap(next)
    setMap(next)
    setDirty(true)
    const total = dropped.objects + dropped.enemyZone + dropped.playerZone
    if (total > 0) {
      setSaveError(`Resize dropped ${dropped.objects} object(s), ${dropped.enemyZone} enemy-zone and ${dropped.playerZone} player-zone tile(s) out of bounds`)
    }
  }, [region, scene])

  const onSave = useCallback(async () => {
    const current = mapRef.current
    if (!current) return
    setSaving(true)
    setSaveError(null)
    try {
      const stored = await saveMap<ContentMap>(GAME_SLUG, mapId, current)
      // 5.2: reload the server's stored map into editor state.
      mapRef.current = stored
      scene()?.setMap(stored)
      setMap(stored)
      setDirty(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [mapId, scene])

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-gray-800">
        <Link to={`${HUB}/maps`} className="text-sm text-indigo-400 hover:text-indigo-300 whitespace-nowrap">
          &larr; Maps
        </Link>
        {map ? (
          <input
            type="text"
            value={map.name}
            onChange={(e) => { setMap({ ...map, name: e.target.value }); setDirty(true) }}
            aria-label="map name"
            className="min-w-0 flex-1 mx-2 rounded bg-gray-800 px-2 py-1 text-sm font-semibold text-white ring-1 ring-gray-700 focus:outline-none focus:ring-indigo-500"
          />
        ) : (
          <span className="text-sm font-semibold truncate">Map Editor</span>
        )}
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-300">unsaved</span>}
          <button
            onClick={onSave}
            disabled={!canSave}
            className={`rounded px-3 py-1 text-sm font-medium ${canSave ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-900/40 px-4 py-1.5 text-xs text-red-200">{saveError}</div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-300">
            {loadError} — <button className="ml-1 underline" onClick={() => navigate(`${HUB}/maps`)}>back to maps</button>
          </div>
        )}
        {!loadError && (!map || !region) && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Loading…</div>
        )}
        {map && region && (
          <>
            {/* key on mapId so a route change fully remounts the Phaser game */}
            <PhaserGame key={mapId} buildConfig={buildConfig} onGameReady={onGameReady} />
            <MapEditorHud
              region={region}
              map={map}
              tool={tool}
              brush={brush}
              problems={problems}
              onToolChange={setTool}
              onBrushChange={(partial) => setBrush((b) => ({ ...b, ...partial }))}
              onResize={onResize}
            />
          </>
        )}
      </div>
    </div>
  )
}
