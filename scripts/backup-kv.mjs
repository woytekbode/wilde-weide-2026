/**
 * Dumpt alle keys uit de KV-namespace naar server/data/kv-backup.json:
 * een lokale snapshot van alle groepsdata, die in dev ook als seed voor
 * .data/kv dient (zie server/plugins/seed-dev-kv.ts). Dit bestand bevat
 * privé group-slugs en is gitignored — committen doe je niet.
 * Gebruik: npm run backup-kv.
 */
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const NAMESPACE_ID = 'dd0b208488e04a2ea2dfff9fd75167a5'
const OUT = new URL('../server/data/kv-backup.json', import.meta.url)

// wrangler print soms een banner vóór de output; alles tot de eerste { of [ weggooien
function wranglerJson(args) {
  const uit = execSync(`npx wrangler ${args}`, { encoding: 'utf8' })
  const start = uit.search(/[[{]/)
  if (start === -1) throw new Error(`geen JSON in wrangler-output:\n${uit}`)
  return JSON.parse(uit.slice(start))
}

const lijst = wranglerJson(`kv key list --namespace-id ${NAMESPACE_ID} --remote`)
const keys = {}
for (const { name } of lijst.sort((a, b) => a.name.localeCompare(b.name))) {
  keys[name] = wranglerJson(`kv key get "${name}" --namespace-id ${NAMESPACE_ID} --remote`)
  console.log(`${name}: ${Object.keys(keys[name]).length} entries`)
}

writeFileSync(OUT, JSON.stringify({ exportedAt: new Date().toISOString(), keys }, null, 2) + '\n')
console.log(`\n${lijst.length} key(s) → server/data/kv-backup.json — check git diff en commit.`)
