import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'primary' | 'info' | 'danger' | 'active'

// Shared visual styles for HUD controls. `pointer-events-auto` is baked in so
// every control is tappable even though the HUD overlay container itself is
// `pointer-events-none` (so empty regions fall through to the Phaser board).
const VARIANTS: Record<Variant, string> = {
  default: 'border-gray-600 bg-gray-800/90 text-white hover:bg-gray-700',
  primary: 'border-green-400 bg-green-600 text-white hover:bg-green-500',
  info: 'border-blue-400 bg-blue-600 text-white hover:bg-blue-500',
  danger: 'border-gray-600 bg-gray-800/90 text-gray-300 hover:bg-gray-700',
  active: 'border-orange-400 bg-orange-600 text-white hover:bg-orange-500',
}

export default function HudButton({
  variant = 'default',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto rounded border px-3 py-1.5 text-sm font-semibold shadow disabled:cursor-default disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
