import { spawn } from 'child_process'
import { resolve } from 'path'
import { mkdirSync, openSync } from 'fs'

const APP_DIR = resolve(__dirname, '..', '..', '..')
const SCRIPT = resolve(APP_DIR, 'server-deploy.sh')
const LOG_DIR = resolve(APP_DIR, 'logs')
const LOG_FILE = resolve(LOG_DIR, 'deploy.log')

/** Spawn the detached server-deploy.sh, appending output to logs/deploy.log. */
export function runDeploy(trigger: string) {
  console.log(`[deploy] Starting deploy (trigger: ${trigger})`)
  mkdirSync(LOG_DIR, { recursive: true })
  const fd = openSync(LOG_FILE, 'a')
  const child = spawn('bash', [SCRIPT], {
    detached: true,
    stdio: ['ignore', fd, fd],
    env: { ...process.env, APP_DIR },
  })
  child.on('error', (err) => console.error(`[deploy] spawn error: ${err.message}`))
  child.unref()
}
