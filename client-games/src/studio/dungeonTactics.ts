// The Dungeon Tactics studio's tool list. Each tool carries an availability
// status so a not-yet-built tool (the Map editor) can render as a disabled
// "coming soon" entry now and light up when its change lands — no restructure.
// Data-only so the hub page and tests share one source of truth.

export type ToolStatus = 'available' | 'coming-soon'

export interface StudioTool {
  label: string
  // Destination route (only navigated to when `status === 'available'`).
  path: string
  status: ToolStatus
  description: string
}

export const DT_STUDIO_TOOLS: StudioTool[] = [
  {
    label: 'Unit Designer',
    path: '/studio/dungeon-tactics/unit-designer',
    status: 'available',
    description: 'Edit unit definitions and save them as Variants.',
  },
  {
    label: 'Map editor',
    path: '/studio/dungeon-tactics/map-editor',
    status: 'coming-soon',
    description: 'Author regions, maps, and encounters.',
  },
]
