import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const featuresDir = join(scriptDir, '../src/games/dungeon-tactics-solo/features')
const outputPath = join(featuresDir, 'steps-catalog.json')

type Keyword = 'given' | 'when' | 'then'

const STEP_LINE = /^(Given|When|Then|And|But)\s+(.+)$/

// Gherkin grammar guarantees the first step in any step list (a Background's
// or a Scenario's) is always a concrete Given/When/Then, never And/But — so
// a single running "last concrete keyword" scanned top-to-bottom through the
// whole file resolves every And/But correctly without needing to track
// feature/rule/scenario/background boundaries separately.
function extractSteps(fileText: string, catalog: Record<Keyword, Set<string>>, fileName: string) {
  let lastKeyword: Keyword | null = null
  let inDocString = false

  for (const rawLine of fileText.split('\n')) {
    const line = rawLine.trim()

    if (line.startsWith('"""') || line.startsWith('```')) {
      inDocString = !inDocString
      continue
    }
    if (inDocString) continue

    const match = STEP_LINE.exec(line)
    if (!match) continue

    const [, keyword, details] = match
    if (keyword === 'Given' || keyword === 'When' || keyword === 'Then') {
      lastKeyword = keyword.toLowerCase() as Keyword
    }
    if (!lastKeyword) {
      throw new Error(`${fileName}: step "${details}" (keyword "${keyword}") has no preceding Given/When/Then to resolve against`)
    }
    catalog[lastKeyword].add(details.trim())
  }
}

function main() {
  const catalog: Record<Keyword, Set<string>> = { given: new Set(), when: new Set(), then: new Set() }

  const featureFileNames = existsSync(featuresDir)
    ? readdirSync(featuresDir).filter((name) => name.endsWith('.feature')).sort()
    : []

  for (const fileName of featureFileNames) {
    const fileText = readFileSync(join(featuresDir, fileName), 'utf-8')
    extractSteps(fileText, catalog, fileName)
  }

  const output = {
    given: [...catalog.given].sort(),
    when: [...catalog.when].sort(),
    then: [...catalog.then].sort(),
  }

  mkdirSync(featuresDir, { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)

  const total = output.given.length + output.when.length + output.then.length
  console.log(`Wrote ${total} unique step(s) from ${featureFileNames.length} feature file(s) to ${outputPath}`)
}

main()
