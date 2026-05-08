interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className ?? ''}`}>
      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
