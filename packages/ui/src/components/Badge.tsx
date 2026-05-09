const colorClasses = {
  indigo: 'bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-700/50',
  violet: 'bg-violet-900/60 text-violet-300 ring-1 ring-violet-700/50',
  gray: 'bg-gray-700 text-gray-300',
}

interface BadgeProps {
  color?: 'indigo' | 'violet' | 'gray'
  className?: string
  children: React.ReactNode
}

export function Badge({ color = 'gray', className, children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
