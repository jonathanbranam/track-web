interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  activeClass?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  activeClass = 'bg-gray-600 text-white',
}: SegmentedControlProps<T>) {
  return (
    <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 min-h-[40px] py-2 text-sm rounded-md transition-colors ${
            value === opt.value ? activeClass : 'text-gray-400 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
