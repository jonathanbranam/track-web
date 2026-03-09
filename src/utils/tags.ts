// Tag token: # or : followed by a letter, then letters/digits/hyphens
// Requires first char to be a letter to avoid false positives like "10:00am"
const TAG_PATTERN = /[#:]([a-zA-Z][a-zA-Z0-9-]*)/g

/**
 * Parse tag tokens from a description string.
 * Both #tag and :tag prefixes are accepted. Returns lowercase, deduplicated tags.
 */
export function parseTags(description: string): string[] {
  const tags = new Set<string>()
  for (const match of description.matchAll(TAG_PATTERN)) {
    tags.add(match[1].toLowerCase())
  }
  return Array.from(tags)
}

/**
 * Normalize the description for storage:
 * - Convert :tag prefixes to #tag
 * - Lowercase the tag text in place
 * Plain text is left untouched.
 */
export function normalizeDescription(description: string): string {
  return description.replace(
    /[#:]([a-zA-Z][a-zA-Z0-9-]*)/g,
    (_, tag) => `#${tag.toLowerCase()}`
  )
}

export function tagsToString(tags: string[]): string {
  return tags.join(',')
}
