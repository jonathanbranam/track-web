export type TerrainType = 'plains' | 'forest' | 'water' | 'stone'
export type UnitKind = 'pc' | 'npc'
export type Direction = 'up' | 'down' | 'left' | 'right'

export interface Cell {
  terrain: TerrainType
  hasStructure: boolean
  structureHp?: number
  structureKind?: 'power-center' | 'tower'
}

export interface PcPlan {
  moveTarget?: { col: number; row: number }
  moveWaypoint?: { col: number; row: number }
  attackDir?: Direction
}

export interface Unit {
  id: string
  kind: UnitKind
  col: number
  row: number
}

export type PlanningPhase = 'none' | 'selecting-move' | 'selecting-attack'
export type TurnPhase = 'player' | 'pc-playback' | 'npc-playback'

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
}

export type PcAction =
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; waypoint?: { col: number; row: number }; attackDir: Direction }
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; waypoint?: { col: number; row: number } }
  | { kind: 'attack'; unitId: string; col: number; row: number; attackDir: Direction }
  | { kind: 'stay'; unitId: string }

export type NpcAction =
  | { kind: 'move'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; waypoint?: { col: number; row: number } }
  | { kind: 'move-attack'; unitId: string; fromCol: number; fromRow: number; toCol: number; toRow: number; waypoint?: { col: number; row: number }; targetCol: number; targetRow: number }
  | { kind: 'attack'; unitId: string; targetCol: number; targetRow: number }
  | { kind: 'exit'; unitId: string; fromCol: number; fromRow: number }
  | { kind: 'stay'; unitId: string }
