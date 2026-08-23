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

export { damageStructure, occupiedKey, structureKeys, isTowerImmune, towerTiles, reconcileHp } from './turn'

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

export { PC_COUNT, initialState, computeNpcTurns, endRound, planNpcUnit } from './npc'

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

// ─── The turn sequencer (engine ownership of a round) ───────────────────────────

export type { SequencerResult, AdvanceResult, NpcMoveChoice, SequencerStep } from './sequencer'
export {
  advanceNpc,
  commitNpcTurn,
  unplannedNpcs,
  plannedTelegraph,
  nextAction,
  advance,
  amendTelegraph,
  plannableAttacks,
  startScenario,
  endPlayerTurn,
} from './sequencer'

export type { EngineMode } from './engine-mode'
export { getEngineMode, setEngineMode } from './engine-mode'

// ─── Scenario setup (bench-only) ────────────────────────────────────────────────
//
// Authoring a starting position directly — board cells, structures, and units
// of either side, on any tile, at any starting HP. Fenced to bench mode and to
// the placement phase (see `scenario.ts`); the shipped game never reaches this
// surface, building its starting position through `initialState()` instead.

export type { ScenarioResult, ScenarioPlaceResult, StructureKind } from './scenario'
export { STRUCTURE_HP } from './scenario'
export * as scenario from './scenario'

// ─── Queries ───────────────────────────────────────────────────────────────────

export { attackFootprint } from './attackFootprint'
export { inBounds, astar, pathToAdjacentCell } from './pathfinding'

// ─── Visual vocabulary (shared presentation, not rules) ────────────────────────
//
// Data both hosts render from: colours, shapes, and HP pip geometry, plus the
// phase → solicited-side table a host combines with its own seating to decide
// whether a unit's outline reads as live or idle. See `palette.ts`'s header for
// why it imports only types — also importable on its own via the `./palette`
// subpath, without the rest of the engine.

export type { PieceShape, OutlineRole } from './palette'
export {
  css,
  TERRAIN,
  STRUCTURE_FILL,
  TOWER_CROSS,
  UNIT_FILL,
  UNIT_INITIAL,
  UNIT_SHAPE,
  STRUCTURE_SHAPE,
  trianglePoints,
  OUTLINE,
  OVERLAY,
  PIP,
  STRUCTURE_PIP_FILL,
  pipHeightRatio,
  SOLICITED_SIDES,
  solicitedSides,
  outlineRole,
} from './palette'

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
