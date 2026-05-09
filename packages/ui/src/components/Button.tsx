const primaryColors = {
  indigo: 'bg-indigo-600 hover:bg-indigo-500',
  violet: 'bg-violet-600 hover:bg-violet-500',
}

const variantBase = {
  primary: 'text-white font-semibold',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white font-medium',
  danger: 'bg-red-600 hover:bg-red-500 text-white font-semibold',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  color?: 'indigo' | 'violet'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  color = 'indigo',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const colorClass = variant === 'primary' ? primaryColors[color] : ''
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${colorClass} ${variantBase[variant]} ${className ?? ''}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          {children}
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      ) : children}
    </button>
  )
}
