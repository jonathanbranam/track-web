export type TerrainType = 'plains' | 'forest' | 'water' | 'stone'
export type UnitKind = 'pc' | 'npc'
export type Direction = 'up' | 'down' | 'left' | 'right'
export type PcType = 'melee' | 'ranger' | 'magic-user' | 'rogue'
export type NpcType = 'short-range' | 'long-range'

export interface Cell {
  terrain: TerrainType
  hasStructure: boolean
  structureHp?: number
  structureKind?: 'power-center' | 'tower'
}

export interface PcPlan {
  moveTarget?: { col: number; row: number }
  movePath?: Array<{ col: number; row: number }>
  attackDir?: Direction
}

export interface Unit {
  id: string
  kind: UnitKind
  col: number
  row: number
  unitType: PcType | NpcType
  hp: number
}

export type PlanningPhase = 'none' | 'selecting-move' | 'selecting-attack'
export type TurnPhase = 'player' | 'pc-playback' | 'npc-playback'

// A reversible record of a committed PC move. Captures everything a move mutates
// so popping it fully restores the prior state: the moving unit's id, its origin
// and destination, and the path travelled (used to animate the reversal).
export interface UndoRecord {
  unitId: string
  fromCol: number
  fromRow: number
  toCol: number
  toRow: number
  path: Array<{ col: number; row: number }>
}

export interface PathFilter {
  ignoreStructures?: boolean
  ignorePcs?: boolean
  ignoreNpcs?: boolean
}

export interface GameState {
  cells: Cell[][]
  units: Unit[]
  spawners: { col: number; row: number }[]
  phase: TurnPhase
  planningPhase: PlanningPhase
  selectedUnitId: string | null
  plans: Record<string, PcPlan>
  planOrder: string[]
  npcPlans: NpcAction[]
  // Stack of reversible PC move records for the current player phase. Pushed on
  // each immediate move, cleared when any PC attacks or the round ends.
  undoStack: UndoRecord[]
  // Per-unit movement consumed this player turn (tiles stepped). A PC may move
  // multiple times but only up to `moveRange` tiles total; remaining = range − this.
  movedThisTurn: Record<string, number>
  // PCs that have attacked this player turn. An attack is committal: once a PC
  // attacks it can neither move nor attack again until the round ends.
  attackedThisTurn: string[]
}

export type PcAction =
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; path: Array<{ col: number; row: number }>; attackDir: Direction }
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; path: Array<{ col: number; row: number }> }
  | { kind: 'attack'; unitId: string; col: number; row: number; attackDir: Direction }
  | { kind: 'stay'; unitId: string }

export type NpcAction =
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; path: Array<{ col: number; row: number }> }
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; path: Array<{ col: number; row: number }>; targetCol: number; targetRow: number }
  | { kind: 'attack'; unitId: string; targetCol: number; targetRow: number }
  | { kind: 'exit'; unitId: string; fromCol: number; fromRow: number }
  | { kind: 'stay'; unitId: string }
