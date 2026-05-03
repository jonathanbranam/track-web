interface TagChipProps {
  tag: string
}

export default function TagChip({ tag }: TagChipProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900/60 text-indigo-300 ring-1 ring-indigo-700/50">
      #{tag}
    </span>
  )
}

export function parseTags(tagsStr: string): string[] {
  return tagsStr ? tagsStr.split(',').filter(Boolean) : []
}
