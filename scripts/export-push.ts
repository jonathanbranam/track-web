import 'dotenv/config'
import { scheduledBackupAndPush } from '../src/lib/backup'

function main() {
  const stamp = new Date().toISOString()
  console.log(`Running export-push at ${stamp}`)
  const result = scheduledBackupAndPush()
  if (result.pushed) {
    console.log('Backup pushed.')
  } else {
    console.log('No changes in backup, skipping push.')
  }
}

main()
