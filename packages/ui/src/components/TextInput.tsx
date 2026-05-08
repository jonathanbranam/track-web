const focusRings = {
  indigo: 'focus:ring-2 focus:ring-indigo-500',
  violet: 'focus:ring-2 focus:ring-violet-500',
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  color?: 'indigo' | 'violet'
}

export function TextInput({ label, error, color = 'indigo', className, id, ...props }: TextInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        className={`w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none ${focusRings[color]} text-sm ${className ?? ''}`}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
