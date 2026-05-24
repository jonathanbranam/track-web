export const CATALOG_RESULT_CAP = 12

export function isSignificant(q: string): boolean {
  const stripped = q.toLowerCase().replace(/^(the |an |a )/, '').replace(/\s+/g, '')
  return stripped.length >= 3
}

export function filterByTitle<T extends { title: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(i => i.title.toLowerCase().includes(q))
}

export interface MediaKey {
  id: number
  mediaType: 'movie' | 'tv'
}

export function excludeRated<T extends MediaKey>(results: T[], rated: MediaKey[]): T[] {
  const keys = new Set(rated.map(r => `${r.mediaType}-${r.id}`))
  return results.filter(r => !keys.has(`${r.mediaType}-${r.id}`))
}

export function excludeDuplicates<T extends { isDuplicate: boolean }>(results: T[]): T[] {
  return results.filter(r => !r.isDuplicate)
}
