// The public surface of the Dungeon Tactics rules engine.
//
// Everything a host needs to run the game — board and unit types, turn
// sequencing, PC and NPC action resolution, pathfinding, attack footprints, the
// bundled unit-definition table, and the in-memory definition and content
// stores — and nothing that performs I/O. The engine never fetches from a server
// and never reads or writes browser storage: a host loads definitions and board
// content itself and hands them over via `applyLoaded` / `applyMap`.
//
// Modules inside the package may import each other directly; consumers outside
// it import from here.

// ─── Types ─────────────────────────────────────────────────────────────────────

export type {
  TerrainType,
  UnitKind,
  Direction,
  PcType,
  NpcType,
  UnitDef,
  Cell,
  PcPlan,
  Unit,
  PlanningPhase,
  TurnPhase,
  UndoRecord,
  PathFilter,
  Tile,
  GameState,
  PcAction,
  NpcAction,
  NpcAttackPlan,
} from './types'

export type {
  ContentRegion,
  ContentObject,
  ContentMap,
  WaveStartTrigger,
  Wave,
  Condition,
  ContentEncounter,
  ContentTree,
} from './contentTypes'

// ─── Turn sequencing and board rules ───────────────────────────────────────────

export { damageStructure, occupiedKey, structureKeys, isTowerImmune, reconcileHp } from './turn'

// ─── PC actions ────────────────────────────────────────────────────────────────

export {
  moveRange,
  attackDamage,
  unitDisplayName,
  selectUnit,
  cancelSelection,
  selectForPlacement,
  placeUnit,
  beginPlanMove,
  beginPlanAttack,
  setPlanMove,
  setPlanAttack,
  clearPlan,
  clearPlanMove,
  clearPlanAttack,
  remainingMove,
  hasAttacked,
  pushUndo,
  clearUndo,
  applyMove,
  undoLastMove,
  validMoveDests,
  computeMovePath,
  attackSquares,
  resolvePcAction,
} from './pc'

// ─── NPC turns and round sequencing ────────────────────────────────────────────

export { PC_COUNT, initialState, computeNpcTurns, resolveNpcAction, endRound } from './npc'

// ─── The action surface (the supported way for a host to drive a unit) ─────────

export type {
  ActionId,
  SelectionKind,
  OverlayHint,
  ActionOption,
  ActionEffect,
  ActionPreview,
  CommitResult,
} from './actions'
export { availableActions, preview, commitAction, threatTiles } from './actions'

// ─── Queries ───────────────────────────────────────────────────────────────────

export { attackFootprint } from './attackFootprint'
export { inBounds, astar, pathToAdjacentCell } from './pathfinding'

// ─── Bundled content (the offline seed / fallback) ─────────────────────────────

export { unitDefs } from './unitDefs'
export { BUNDLED_MAP } from './bundledMap'

// ─── Unit-definition store (state; loading is the host's job) ──────────────────

export {
  getDef,
  getMaxHp,
  getMoveRange,
  getAllDefs,
  setDef,
  setMaxHp,
  setMoveRange,
  clampDef,
  withMinRange,
  withMaxRange,
  diffDefs,
  applyLoaded,
  reset as resetDefs,
} from './defStore'

// ─── Board-content store (state; loading is the host's job) ────────────────────

export type { ActiveContent } from './contentStore'
export {
  deserialize,
  gridCols,
  gridRows,
  boardCells,
  playerSpawnZone,
  enemySpawners,
  playerStartTiles,
  applyMap,
  reset as resetContent,
} from './contentStore'
