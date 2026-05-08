import { Badge } from '@repo/ui'

interface TagChipProps {
  tag: string
}

export default function TagChip({ tag }: TagChipProps) {
  return <Badge color="indigo">#{tag}</Badge>
}

export function parseTags(tagsStr: string): string[] {
  return tagsStr ? tagsStr.split(',').filter(Boolean) : []
}
