import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let sha = 'dev'
let commitTime = null
try {
  sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8', cwd: root }).trim()
  commitTime = execSync('git log -1 --format=%cI', { encoding: 'utf-8', cwd: root }).trim()
} catch {
  // not in a git repo or no commits yet
}

const buildTime = new Date().toISOString()
const info = { sha, commitTime, buildTime }
writeFileSync(join(root, 'version.json'), JSON.stringify(info) + '\n')
console.log(`[gen-version] ${JSON.stringify(info)}`)
