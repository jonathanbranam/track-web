export interface TocEntry {
  level: 2 | 3
  text: string
  id: string
}

/** Slugify heading text: lowercase, non-alphanumerics → `-`, collapsed and trimmed. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Scan a Markdown source string for `##` (H2) and `###` (H3) headings, in
 * document order, ignoring fenced code blocks. Returns ordered entries with
 * slugified ids; ids are de-duplicated with a `-1`, `-2`, … counter so repeated
 * heading text still yields distinct anchors. The renderer assigns the same ids
 * by consuming this list in document order, keeping TOC links and heading ids in
 * sync.
 */
export function buildToc(markdown: string | null | undefined): TocEntry[] {
  if (!markdown) return []

  const entries: TocEntry[] = []
  const idCounts = new Map<string, number>()
  let inFence = false

  for (const line of markdown.split('\n')) {
    const fence = line.match(/^\s*(```|~~~)/)
    if (fence) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const heading = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/)
    if (!heading) continue

    const level = heading[1].length as 2 | 3
    const text = heading[2].trim()
    const base = slugify(text) || 'section'

    const seen = idCounts.get(base) ?? 0
    idCounts.set(base, seen + 1)
    const id = seen === 0 ? base : `${base}-${seen}`

    entries.push({ level, text, id })
  }

  return entries
}
