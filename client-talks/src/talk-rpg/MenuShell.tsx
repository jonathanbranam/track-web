import { useDirector } from './Director'

interface MenuListProps {
  options: string[]
  selectedIndex: number
}

/** Highlight moves as a single fixed 150ms step (`duration-150`), never a slide scaling with distance — idea-board.md §11's "restrain motion" lock. */
function MenuOptionList({ options, selectedIndex }: MenuListProps) {
  return (
    <div className="space-y-1">
      {options.map((option, index) => (
        <div
          key={option}
          className={`flex items-center gap-2 rounded px-2 py-1 transition-all duration-150 ${
            index === selectedIndex ? 'bg-blue-600/80' : ''
          }`}
        >
          <span className={`transition-opacity duration-150 ${index === selectedIndex ? 'opacity-100' : 'opacity-0'}`}>
            ▶
          </span>
          <span>{option}</span>
        </div>
      ))}
    </div>
  )
}

/** The "authentic, blue-bordered" command window direction locked in idea-board.md §9. */
function CommandWindow({ options, selectedIndex }: MenuListProps) {
  return (
    <div className="pointer-events-none absolute bottom-20 right-6 z-10">
      <div className="w-56 rounded-md border-4 border-blue-500 bg-blue-950/95 p-3 font-mono text-xl text-white shadow-2xl">
        <MenuOptionList options={options} selectedIndex={selectedIndex} />
      </div>
    </div>
  )
}

/** Stat rows are literal placeholder text until Phase 6 supplies real content — structure only. */
function StatusScreen({ options, selectedIndex }: MenuListProps) {
  return (
    <div className="pointer-events-none absolute inset-8 z-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-md border-4 border-blue-500 bg-blue-950/95 p-5 font-mono text-white shadow-2xl">
        <div className="mb-3 text-xl font-bold uppercase tracking-wide text-sky-300">Status</div>
        <div className="space-y-1 text-lg">
          <div>HP: --</div>
          <div>MP: --</div>
          <div>Level: --</div>
        </div>
        {options.length > 0 && (
          <div className="mt-4 border-t border-blue-700 pt-3">
            <MenuOptionList options={options} selectedIndex={selectedIndex} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders `resting.ui`'s menu variant: a command window or a status/inspection screen. */
export default function MenuShell() {
  const { resting } = useDirector()
  const { ui } = resting
  if (ui.kind !== 'menu') return null

  return ui.menuKind === 'status' ? (
    <StatusScreen options={ui.options} selectedIndex={ui.selectedIndex} />
  ) : (
    <CommandWindow options={ui.options} selectedIndex={ui.selectedIndex} />
  )
}
