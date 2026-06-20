import 'dotenv/config'
import { restoreFromFolder, MigrationMismatchError } from '../src/lib/backup'

function usage(): never {
  console.error('Usage: npm run db:import -- --from <export-folder-name-or-path> [--force]')
  process.exit(1)
}

function main() {
  const argv = process.argv.slice(2)
  const fromIdx = argv.indexOf('--from')
  const folderArg = fromIdx !== -1 ? argv[fromIdx + 1] : argv[0]
  const force = argv.includes('--force')
  if (!folderArg) usage()

  try {
    const result = restoreFromFolder(folderArg, { force })
    console.log(`Import complete from ${folderArg} — ${result.tables} tables, ${result.inserted} rows restored`)
    if (result.exportedAt) {
      console.log(`  (exported at ${result.exportedAt}, originally ${result.totalRows} rows)`)
    }
  } catch (err) {
    if (err instanceof MigrationMismatchError) {
      console.error(err.message)
      console.error('Error: Migration mismatch. Use --force to import anyway.')
      process.exit(1)
    }
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

main()
