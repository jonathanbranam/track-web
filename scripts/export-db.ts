import 'dotenv/config'
import { TABLE_NAMES } from '../src/db'
import { exportTimestamped, exportRolling } from '../src/lib/backup'

function main() {
  const rolling = process.argv.includes('--backup')
  const result = rolling ? exportRolling() : exportTimestamped()
  console.log(`Export complete: exports/${result.folder} — ${TABLE_NAMES.length} tables, ${result.totalRows} total rows`)
}

main()
