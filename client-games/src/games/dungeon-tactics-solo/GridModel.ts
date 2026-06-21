export const GRID_COLS = 16
export const GRID_ROWS = 8

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

// 16×8 map. Terrain: terrains[(col+row)%4] = plains/forest/water/stone.
// Power centers (P): (8,2) (5,4) (11,4) (2,6) (14,6)   Tower (T): (8,6)
// Spawners (E): (0,1) (4,0) (7,0) (10,0) (15,1)   PCs (C): (2,7) (6,7) (10,7) (13,7)
export const SPAWNER_POSITIONS: { col: number; row: number }[] = [
  { col: 0,  row: 1 },
  { col: 4,  row: 0 },
  { col: 7,  row: 0 },
  { col: 10, row: 0 },
  { col: 15, row: 1 },
]

export const INITIAL_MAP: Cell[][] = [
  // row 0
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
  ],
  // row 1
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
  ],
  // row 2 — power center at col 8
  [
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
  ],
  // row 3
  [
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
  ],
  // row 4 — power centers at cols 5 and 11
  [
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
  ],
  // row 5
  [
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
  ],
  // row 6 — power centers at cols 2 and 14, tower at col 8
  [
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 5, structureKind: 'tower' },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: true, structureHp: 3, structureKind: 'power-center' },
    { terrain: 'forest', hasStructure: false },
  ],
  // row 7 — PC start positions at cols 2, 6, 10, 13
  [
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
    { terrain: 'stone',  hasStructure: false },
    { terrain: 'plains', hasStructure: false },
    { terrain: 'forest', hasStructure: false },
    { terrain: 'water',  hasStructure: false },
  ],
]

export function initialState(): GameState {
  const base: Omit<GameState, 'npcPlans'> = {
    cells: INITIAL_MAP.map((row) => row.map((cell) => ({ ...cell }))),
    units: [
      { id: 'npc-0', kind: 'npc', col: 0,  row: 1 },
      { id: 'npc-1', kind: 'npc', col: 4,  row: 0 },
      { id: 'npc-2', kind: 'npc', col: 7,  row: 0 },
      { id: 'npc-3', kind: 'npc', col: 10, row: 0 },
      { id: 'npc-4', kind: 'npc', col: 15, row: 1 },
      { id: 'pc-0',  kind: 'pc',  col: 2,  row: 7 },
      { id: 'pc-1',  kind: 'pc',  col: 6,  row: 7 },
      { id: 'pc-2',  kind: 'pc',  col: 10, row: 7 },
      { id: 'pc-3',  kind: 'pc',  col: 13, row: 7 },
    ],
    spawners: SPAWNER_POSITIONS,
    phase: 'player',
    planningPhase: 'none',
    selectedUnitId: null,
    plans: {},
    planOrder: [],
  }
  return { ...base, npcPlans: computeNpcPlans(base as GameState) }
}

// ─── Planning helpers ────────────────────────────────────────────────────────

export function selectUnit(state: GameState, id: string): GameState {
  return { ...state, selectedUnitId: id, planningPhase: 'none' }
}

export function cancelSelection(state: GameState): GameState {
  return { ...state, selectedUnitId: null, planningPhase: 'none' }
}

export function beginPlanMove(state: GameState): GameState {
  return { ...state, planningPhase: 'selecting-move' }
}

export function beginPlanAttack(state: GameState): GameState {
  return { ...state, planningPhase: 'selecting-attack' }
}

export function setPlanMove(state: GameState, unitId: string, col: number, row: number, waypoint?: { col: number; row: number }): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, moveTarget: { col, row }, moveWaypoint: waypoint } },
    planOrder: newPlanOrder,
    planningPhase: 'none',
  }
}

export function setPlanAttack(state: GameState, unitId: string, dir: Direction): GameState {
  const existing = state.plans[unitId] ?? {}
  const newPlanOrder = [...state.planOrder.filter((id) => id !== unitId), unitId]
  return {
    ...state,
    plans: { ...state.plans, [unitId]: { ...existing, attackDir: dir } },
    planOrder: newPlanOrder,
    planningPhase: 'none',
  }
}

export function clearPlan(state: GameState, unitId: string): GameState {
  const plans = { ...state.plans }
  delete plans[unitId]
  return {
    ...state,
    plans,
    planOrder: state.planOrder.filter((id) => id !== unitId),
  }
}

export function clearPlanMove(state: GameState, unitId: string): GameState {
  const existing = state.plans[unitId]
  if (!existing?.moveTarget) return { ...state, planningPhase: 'none' }
  const plans = { ...state.plans }
  if (!existing.attackDir) {
    delete plans[unitId]
    return { ...state, plans, planOrder: state.planOrder.filter((id) => id !== unitId), planningPhase: 'none' }
  }
  plans[unitId] = { attackDir: existing.attackDir }
  return { ...state, plans, planningPhase: 'none' }
}

export function clearPlanAttack(state: GameState, unitId: string): GameState {
  const existing = state.plans[unitId]
  if (!existing?.attackDir) return { ...state, planningPhase: 'none' }
  const plans = { ...state.plans }
  if (!existing.moveTarget) {
    delete plans[unitId]
    return { ...state, plans, planOrder: state.planOrder.filter((id) => id !== unitId), planningPhase: 'none' }
  }
  plans[unitId] = { moveTarget: existing.moveTarget }
  return { ...state, plans, planningPhase: 'none' }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const DIR_OFFSETS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

function inBounds(col: number, row: number): boolean {
  return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS
}

function occupiedKey(units: Unit[]): Set<string> {
  return new Set(units.map((u) => `${u.col},${u.row}`))
}

function structureKeys(cells: Cell[][]): Set<string> {
  const keys = new Set<string>()
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (cells[r][c].hasStructure) keys.add(`${c},${r}`)
    }
  }
  return keys
}

function powerCenterCount(cells: Cell[][]): number {
  let n = 0
  for (let r = 0; r < GRID_ROWS; r++)
    for (let c = 0; c < GRID_COLS; c++)
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'power-center') n++
  return n
}

export function isTowerImmune(cells: Cell[][]): boolean {
  return powerCenterCount(cells) >= 2
}

function findAdjacentStructure(
  cells: Cell[][],
  col: number,
  row: number,
  towerImmune: boolean,
): { col: number; row: number } | null {
  for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const nc = col + dc
    const nr = row + dr
    if (!inBounds(nc, nr) || !cells[nr][nc].hasStructure) continue
    if (towerImmune && cells[nr][nc].structureKind === 'tower') continue
    return { col: nc, row: nr }
  }
  return null
}

function damageStructure(cells: Cell[][], col: number, row: number): Cell[][] {
  const hp = cells[row][col].structureHp ?? 0
  if (hp <= 0) return cells
  const newHp = hp - 1
  return cells.map((r, ri) =>
    ri !== row ? r : r.map((c, ci) =>
      ci !== col ? c : { ...c, structureHp: newHp, hasStructure: newHp > 0 }
    )
  )
}

export function astar(
  cells: Cell[][],
  units: Unit[],
  start: { col: number; row: number },
  goal: { col: number; row: number },
  filter: PathFilter,
  selfId?: string,
): Array<{ col: number; row: number }> | null {
  const key = (c: number, r: number) => `${c},${r}`
  const startKey = key(start.col, start.row)
  const goalKey = key(goal.col, goal.row)
  if (startKey === goalKey) return []

  const blocked = new Set<string>()
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (cells[r][c].hasStructure && !filter.ignoreStructures) blocked.add(key(c, r))
    }
  }
  for (const u of units) {
    if (u.id === selfId) continue
    if (u.kind === 'pc' && filter.ignorePcs) continue
    if (u.kind === 'npc' && filter.ignoreNpcs) continue
    blocked.add(key(u.col, u.row))
  }
  blocked.delete(goalKey)

  const h = (c: number, r: number) => Math.abs(c - goal.col) + Math.abs(r - goal.row)
  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, h(start.col, start.row)]])
  const cameFrom = new Map<string, string | null>([[startKey, null]])
  const posMap = new Map<string, { col: number; row: number }>([[startKey, start]])
  const openSet = new Set<string>([startKey])

  while (openSet.size > 0) {
    let current = ''
    let minF = Infinity
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity
      if (f < minF) { minF = f; current = k }
    }
    if (current === goalKey) {
      const path: Array<{ col: number; row: number }> = []
      let k: string | null = current
      while (k !== null && k !== startKey) {
        path.unshift(posMap.get(k)!)
        k = cameFrom.get(k) ?? null
      }
      return path
    }
    openSet.delete(current)
    const { col, row } = posMap.get(current)!
    const g = gScore.get(current) ?? Infinity
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
      const nc = col + dc
      const nr = row + dr
      if (!inBounds(nc, nr) || blocked.has(key(nc, nr))) continue
      const nk = key(nc, nr)
      const ng = g + 1
      if (ng < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current)
        gScore.set(nk, ng)
        fScore.set(nk, ng + h(nc, nr))
        posMap.set(nk, { col: nc, row: nr })
        openSet.add(nk)
      }
    }
  }
  return null
}

function isAdjacent(col: number, row: number, tCol: number, tRow: number): boolean {
  return Math.abs(col - tCol) + Math.abs(row - tRow) === 1
}

function pathToAdjacentCell(
  cells: Cell[][],
  units: Unit[],
  start: { col: number; row: number },
  target: { col: number; row: number },
  filter: PathFilter,
  selfId: string,
): Array<{ col: number; row: number }> | null {
  let best: Array<{ col: number; row: number }> | null = null
  for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][]) {
    const gc = target.col + dc
    const gr = target.row + dr
    if (!inBounds(gc, gr)) continue
    const path = astar(cells, units, start, { col: gc, row: gr }, filter, selfId)
    if (path !== null && (best === null || path.length < best.length)) best = path
  }
  return best
}

function computeNpcPlans(state: GameState): NpcAction[] {
  const actions: NpcAction[] = []
  let workingUnits = [...state.units]
  const cells = state.cells
  const towerImmune = isTowerImmune(cells)

  // Ignore all units for pathfinding; resolve actual occupancy at execution time
  const npcFilter: PathFilter = { ignoreNpcs: true, ignorePcs: true }

  let towerPos: { col: number; row: number } | null = null
  for (let r = 0; r < GRID_ROWS && towerPos === null; r++) {
    for (let c = 0; c < GRID_COLS && towerPos === null; c++) {
      if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') towerPos = { col: c, row: r }
    }
  }

  for (const npc of state.units.filter((u) => u.kind === 'npc')) {
    const live = workingUnits.find((u) => u.id === npc.id)
    if (!live) continue

    if (live.row === GRID_ROWS - 1) {
      actions.push({ kind: 'exit', unitId: live.id, fromCol: live.col, fromRow: live.row })
      workingUnits = workingUnits.filter((u) => u.id !== live.id)
      continue
    }

    // Highest priority: attack any adjacent attackable structure
    const adjStruct = findAdjacentStructure(cells, live.col, live.row, towerImmune)
    if (adjStruct) {
      actions.push({ kind: 'attack', unitId: live.id, targetCol: adjStruct.col, targetRow: adjStruct.row })
      continue
    }

    // Determine target: tower when open, nearest power-center when tower is immune
    let targetPos: { col: number; row: number } | null = null
    if (!towerImmune && towerPos) {
      targetPos = towerPos
    } else {
      let bestDist = Infinity
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (cells[r][c].hasStructure && cells[r][c].structureKind === 'power-center') {
            const dist = Math.abs(c - live.col) + Math.abs(r - live.row)
            if (dist < bestDist) { bestDist = dist; targetPos = { col: c, row: r } }
          }
        }
      }
    }

    if (!targetPos) {
      actions.push({ kind: 'stay', unitId: live.id })
      continue
    }

    const path = pathToAdjacentCell(cells, workingUnits, live, targetPos, npcFilter, live.id)

    if (path !== null && path.length > 0) {
      const nextStep = path[0]
      const occupant = workingUnits.find((u) => u.id !== live.id && u.col === nextStep.col && u.row === nextStep.row)

      if (occupant?.kind === 'pc') {
        actions.push({ kind: 'attack', unitId: live.id, targetCol: nextStep.col, targetRow: nextStep.row })
        continue
      }

      if (!occupant) {
        if (isAdjacent(nextStep.col, nextStep.row, targetPos.col, targetPos.row)) {
          actions.push({ kind: 'move-attack', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: nextStep.col, toRow: nextStep.row, targetCol: targetPos.col, targetRow: targetPos.row })
        } else {
          actions.push({ kind: 'move', unitId: live.id, fromCol: live.col, fromRow: live.row, toCol: nextStep.col, toRow: nextStep.row })
        }
        workingUnits = workingUnits.map((u) => u.id === live.id ? { ...u, col: nextStep.col, row: nextStep.row } : u)
        continue
      }
    }

    actions.push({ kind: 'stay', unitId: live.id })
  }

  return actions
}

export function validMoveDests(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)

  // BFS up to 2 orthogonal steps; blockers (units/structures) stop movement through that cell
  const reachable = new Set<string>()
  const visited = new Set<string>([`${unit.col},${unit.row}`])
  const queue: Array<{ col: number; row: number; steps: number }> = [
    { col: unit.col, row: unit.row, steps: 0 },
  ]

  while (queue.length > 0) {
    const { col, row, steps } = queue.shift()!
    if (steps >= 2) continue
    for (const [dc, dr] of Object.values(DIR_OFFSETS) as [number, number][]) {
      const nc = col + dc
      const nr = row + dr
      const key = `${nc},${nr}`
      if (!inBounds(nc, nr) || structures.has(key) || occupied.has(key)) continue
      if (!visited.has(key)) {
        visited.add(key)
        reachable.add(key)
        queue.push({ col: nc, row: nr, steps: steps + 1 })
      }
    }
  }

  return Array.from(reachable).map((key) => {
    const [c, r] = key.split(',').map(Number)
    return { col: c, row: r }
  })
}

export function computeMoveWaypoint(
  state: GameState,
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
): { col: number; row: number } | undefined {
  const dc = toCol - fromCol
  const dr = toRow - fromRow
  if (Math.abs(dc) + Math.abs(dr) <= 1) return undefined
  if (dc === 0 || dr === 0) {
    return { col: fromCol + Math.sign(dc), row: fromRow + Math.sign(dr) }
  }
  // L-shaped: prefer horizontal-first if that intermediate is unblocked
  const occupied = occupiedKey(state.units)
  const structures = structureKeys(state.cells)
  const hFirst = { col: fromCol + Math.sign(dc), row: fromRow }
  if (!occupied.has(`${hFirst.col},${hFirst.row}`) && !structures.has(`${hFirst.col},${hFirst.row}`)) {
    return hFirst
  }
  return { col: fromCol, row: fromRow + Math.sign(dr) }
}

export function attackSquares(state: GameState, unitId: string): { col: number; row: number }[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit) return []
  const plan = state.plans[unitId]
  const baseCol = plan?.moveTarget?.col ?? unit.col
  const baseRow = plan?.moveTarget?.row ?? unit.row
  return (Object.values(DIR_OFFSETS) as [number, number][])
    .map(([dc, dr]) => ({ col: baseCol + dc, row: baseRow + dr }))
    .filter(({ col, row }) => inBounds(col, row))
}

// ─── Turn transitions ─────────────────────────────────────────────────────────

export function endPlayerTurn(state: GameState): { state: GameState; actions: PcAction[] } {
  const actions: PcAction[] = []

  for (const unitId of state.planOrder) {
    const unit = state.units.find((u) => u.id === unitId)
    if (!unit || unit.kind !== 'pc') continue
    const plan = state.plans[unitId]
    if (!plan || (!plan.moveTarget && !plan.attackDir)) {
      actions.push({ kind: 'stay', unitId })
      continue
    }
    if (plan.moveTarget && plan.attackDir) {
      actions.push({
        kind: 'move-attack',
        unitId,
        fromCol: unit.col,
        fromRow: unit.row,
        toCol: plan.moveTarget.col,
        toRow: plan.moveTarget.row,
        waypoint: plan.moveWaypoint,
        attackDir: plan.attackDir,
      })
    } else if (plan.moveTarget) {
      actions.push({
        kind: 'move',
        unitId,
        fromCol: unit.col,
        fromRow: unit.row,
        toCol: plan.moveTarget.col,
        toRow: plan.moveTarget.row,
        waypoint: plan.moveWaypoint,
      })
    } else if (plan.attackDir) {
      actions.push({
        kind: 'attack',
        unitId,
        col: unit.col,
        row: unit.row,
        attackDir: plan.attackDir,
      })
    }
  }

  // PCs with no plan get a stay action (not in planOrder)
  for (const unit of state.units.filter((u) => u.kind === 'pc')) {
    if (!state.planOrder.includes(unit.id)) {
      actions.push({ kind: 'stay', unitId: unit.id })
    }
  }

  return { state: { ...state, phase: 'pc-playback' }, actions }
}

export function resolvePcAction(state: GameState, action: PcAction): GameState {
  if (action.kind === 'stay') return state

  let units = [...state.units]
  const structures = structureKeys(state.cells)

  if (action.kind === 'move' || action.kind === 'move-attack') {
    const otherOccupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const destKey = `${action.toCol},${action.toRow}`
    const blocked = otherOccupied.has(destKey) || structures.has(destKey)

    if (!blocked) {
      units = units.map((u) => (u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u))
    }

    if (action.kind === 'move-attack') {
      const mover = units.find((u) => u.id === action.unitId)!
      const [dc, dr] = DIR_OFFSETS[action.attackDir]
      const tc = mover.col + dc
      const tr = mover.row + dr
      units = units.filter((u) => !(u.kind === 'npc' && u.col === tc && u.row === tr))
    }
  } else if (action.kind === 'attack') {
    const unit = units.find((u) => u.id === action.unitId)!
    const [dc, dr] = DIR_OFFSETS[action.attackDir]
    const tc = unit.col + dc
    const tr = unit.row + dr
    units = units.filter((u) => !(u.kind === 'npc' && u.col === tc && u.row === tr))
  }

  return { ...state, units }
}

export function beginNpcPlayback(state: GameState): { state: GameState; actions: NpcAction[] } {
  return { state: { ...state, phase: 'npc-playback' }, actions: state.npcPlans }
}

export function resolveNpcAction(state: GameState, action: NpcAction): GameState {
  let units = [...state.units]
  let cells = state.cells

  if (action.kind === 'exit') {
    units = units.filter((u) => u.id !== action.unitId)
  } else if (action.kind === 'move') {
    const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const structures = structureKeys(cells)
    const destKey = `${action.toCol},${action.toRow}`
    if (!occupied.has(destKey) && !structures.has(destKey)) {
      units = units.map((u) => u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u)
    }
  } else if (action.kind === 'move-attack') {
    const occupied = occupiedKey(units.filter((u) => u.id !== action.unitId))
    const structures = structureKeys(cells)
    const destKey = `${action.toCol},${action.toRow}`
    if (!occupied.has(destKey) && !structures.has(destKey)) {
      units = units.map((u) => u.id === action.unitId ? { ...u, col: action.toCol, row: action.toRow } : u)
    }
    cells = damageStructure(cells, action.targetCol, action.targetRow)
  } else if (action.kind === 'attack') {
    const pcTarget = units.find((u) => u.kind === 'pc' && u.col === action.targetCol && u.row === action.targetRow)
    if (pcTarget) {
      units = units.filter((u) => u.id !== pcTarget.id)
    } else if (cells[action.targetRow]?.[action.targetCol]?.hasStructure) {
      cells = damageStructure(cells, action.targetCol, action.targetRow)
    }
  }

  return { ...state, units, cells }
}

export function endRound(state: GameState): GameState {
  const base = {
    ...state,
    phase: 'player' as TurnPhase,
    planningPhase: 'none' as PlanningPhase,
    selectedUnitId: null,
    plans: {},
    planOrder: [],
    npcPlans: [] as NpcAction[],
  }
  return { ...base, npcPlans: computeNpcPlans(base) }
}
