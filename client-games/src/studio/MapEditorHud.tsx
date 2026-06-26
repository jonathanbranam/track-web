import { useState } from 'react'
import type { ContentMap, ContentRegion } from '../games/dungeon-tactics-solo/contentTypes'
import type { Brush, Tool, ValidationProblem } from '../games/dungeon-tactics-solo/editorModel'
import { TERRAIN_COLORS } from '../games/dungeon-tactics-solo/boardRender'
import { MAP_SIZE_MIN, MAP_SIZE_MAX } from '../games/dungeon-tactics-solo/mapBounds'

// The fixed object palette — matches the seed's kinds (extensible later). A
// `defaultHp` marks a destructible structure; its absence marks an inert object.
export const OBJECT_KINDS: Array<{ kind: string; defaultHp?: number }> = [
  { kind: 'power-center', defaultHp: 3 },
  { kind: 'tower', defaultHp: 5 },
  { kind: 'rubble' },
]

const TOOLS: Array<{ tool: Tool; label: string }> = [
  { tool: 'terrain', label: 'Terrain' },
  { tool: 'object', label: 'Object' },
  { tool: 'enemy-zone', label: 'Enemy zone' },
  { tool: 'player-zone', label: 'Player zone' },
  { tool: 'erase', label: 'Erase' },
]

// Convert a `boardRender` 0xRRGGBB int into a CSS hex string for the swatch.
function cssColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

interface Props {
  region: ContentRegion
  map: ContentMap
  tool: Tool
  brush: Brush
  problems: ValidationProblem[]
  onToolChange: (tool: Tool) => void
  onBrushChange: (partial: Partial<Brush>) => void
  onResize: (cols: number, rows: number) => void
}

// The ReactDOM control surface overlaid on the Phaser editor canvas: tool/brush
// selector, terrain + object palettes, resize control, and a validation summary.
// Holds no map state — it reflects props and reports intent through callbacks.
export default function MapEditorHud({
  region, map, tool, brush, problems, onToolChange, onBrushChange, onResize,
}: Props) {
  const [cols, setCols] = useState(map.size.cols)
  const [rows, setRows] = useState(map.size.rows)

  const objHp = OBJECT_KINDS.find((o) => o.kind === brush.objectKind)?.defaultHp != null

  return (
    <div className="absolute top-2 left-2 z-10 w-56 max-h-[calc(100%-1rem)] overflow-y-auto rounded-lg bg-gray-900/95 p-3 text-sm shadow-lg ring-1 ring-gray-700 space-y-3">
      {/* Tool selector */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Tool</div>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              onClick={() => onToolChange(t.tool)}
              className={`rounded px-2 py-1 text-left ${tool === t.tool ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terrain palette */}
      {tool === 'terrain' && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Terrain</div>
          <div className="flex flex-wrap gap-1">
            {region.terrainTypes.map((t) => (
              <button
                key={t}
                onClick={() => onBrushChange({ terrain: t })}
                className={`flex items-center gap-1 rounded px-2 py-1 ${brush.terrain === t ? 'ring-2 ring-white' : 'ring-1 ring-gray-700'}`}
                style={{ background: 'rgba(31,41,55,0.9)' }}
              >
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: cssColor(TERRAIN_COLORS[t] ?? 0x444444) }} />
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Object palette */}
      {tool === 'object' && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Object</div>
          <div className="flex flex-col gap-1">
            {OBJECT_KINDS.map((o) => (
              <button
                key={o.kind}
                onClick={() => onBrushChange({ objectKind: o.kind, objectHp: o.defaultHp })}
                className={`rounded px-2 py-1 text-left ${brush.objectKind === o.kind ? 'bg-indigo-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
              >
                {o.kind}{o.defaultHp != null ? ` (hp ${o.defaultHp})` : ' (inert)'}
              </button>
            ))}
          </div>
          {objHp && (
            <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
              HP
              <input
                type="number"
                min={1}
                value={brush.objectHp ?? 1}
                onChange={(e) => onBrushChange({ objectHp: Math.max(1, Number(e.target.value) || 1) })}
                className="w-16 rounded bg-gray-800 px-2 py-1 text-white ring-1 ring-gray-700"
              />
            </label>
          )}
        </div>
      )}

      {/* Resize */}
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Resize</div>
        <div className="flex items-center gap-1">
          <input
            type="number" min={MAP_SIZE_MIN} max={MAP_SIZE_MAX} value={cols}
            onChange={(e) => setCols(Number(e.target.value) || MAP_SIZE_MIN)}
            className="w-14 rounded bg-gray-800 px-2 py-1 text-white ring-1 ring-gray-700"
            aria-label="columns"
          />
          <span className="text-gray-500">×</span>
          <input
            type="number" min={MAP_SIZE_MIN} max={MAP_SIZE_MAX} value={rows}
            onChange={(e) => setRows(Number(e.target.value) || MAP_SIZE_MIN)}
            className="w-14 rounded bg-gray-800 px-2 py-1 text-white ring-1 ring-gray-700"
            aria-label="rows"
          />
          <button
            onClick={() => onResize(cols, rows)}
            className="rounded bg-gray-700 px-2 py-1 hover:bg-gray-600"
          >
            Apply
          </button>
        </div>
        <div className="mt-1 text-xs text-gray-500">Current: {map.size.cols}×{map.size.rows}</div>
      </div>

      {/* Validation summary */}
      {problems.length > 0 && (
        <div className="rounded bg-red-900/40 p-2 text-xs text-red-200 ring-1 ring-red-800">
          <div className="font-semibold">{problems.length} problem{problems.length > 1 ? 's' : ''}</div>
          <ul className="mt-1 list-disc pl-4">
            {problems.slice(0, 5).map((p, i) => <li key={i}>{p.message}</li>)}
            {problems.length > 5 && <li>…and {problems.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
