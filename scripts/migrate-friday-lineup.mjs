/**
 * Eenmalige migratie voor de vrijdag-line-upwijziging (Bamboebos, nacht 2026-07-03):
 * The Blessed Madonna geschrapt, Chloé Caillet naar voren (00:00 -> 22:00), DJ EZ nieuw
 * als afsluiter (00:00). Omdat de scoreKey de starttijd bevat, zou Chloé's key
 * veranderen en zouden haar reeds gegeven hartjes wezen worden. Dit script hernoemt
 * per groep haar entry in de `scores:<slug>`-blob en ruimt de Madonna-orphan op.
 *
 * KV is de single source of truth (zie geheugen groepen-kv-architectuur); alleen via
 * wrangler bereikbaar. Vereist `wrangler login` en draai ONGESANDBOxED (wrangler geeft
 * anders spawn EPERM). Idempotent: is de oude key weg, dan wordt de groep overgeslagen.
 *
 * Gebruik:
 *   node scripts/migrate-friday-lineup.mjs --dry-run   # toont wat er zou gebeuren
 *   node scripts/migrate-friday-lineup.mjs             # voert de migratie uit
 */
import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const NAMESPACE_ID = 'dd0b208488e04a2ea2dfff9fd75167a5'
const DRY = process.argv.includes('--dry-run')

const CHLOE_OLD = 'vrijdag-chlo-caillet-00:00'
const CHLOE_NEW = 'vrijdag-chlo-caillet-22:00'
const MADONNA = 'vrijdag-the-blessed-madonna-22:00'

// wrangler print soms een banner vóór de output; alles tot de eerste { of [ weggooien
function wranglerJson(args) {
  const uit = execSync(`npx wrangler ${args}`, { encoding: 'utf8' })
  const start = uit.search(/[[{]/)
  if (start === -1) throw new Error(`geen JSON in wrangler-output:\n${uit}`)
  return JSON.parse(uit.slice(start))
}

const lijst = wranglerJson(`kv key list --namespace-id ${NAMESPACE_ID} --remote`)
const tmp = join(tmpdir(), 'ww-migrate-kv.json')
let gewijzigd = 0

for (const { name } of lijst) {
  if (!name.startsWith('scores:')) continue
  const blob = wranglerJson(`kv key get "${name}" --namespace-id ${NAMESPACE_ID} --remote`)

  const acties = []
  // Chloé: hernoem entry (waarde incl. originele t) naar de nieuwe 22:00-key.
  if (blob[CHLOE_OLD] && !blob[CHLOE_NEW]) {
    blob[CHLOE_NEW] = blob[CHLOE_OLD]
    delete blob[CHLOE_OLD]
    acties.push(`chloé 00:00 -> 22:00 (${blob[CHLOE_NEW].status} ${blob[CHLOE_NEW].score ?? ''})`)
  }
  // Madonna is geschrapt: orphan opruimen.
  if (blob[MADONNA]) {
    delete blob[MADONNA]
    acties.push('madonna verwijderd')
  }
  if (acties.length === 0) continue

  gewijzigd++
  console.log(`${name}: ${acties.join(', ')}${DRY ? '  (dry-run)' : ''}`)
  if (!DRY) {
    // via --path schrijven zodat we niet met shell-quoting van de JSON hoeven te vechten
    writeFileSync(tmp, JSON.stringify(blob))
    execSync(`npx wrangler kv key put "${name}" --path "${tmp}" --namespace-id ${NAMESPACE_ID} --remote`)
    unlinkSync(tmp)
  }
}

console.log(`\n${gewijzigd} groep(en) ${DRY ? 'zouden wijzigen' : 'gewijzigd'}.`)
if (!DRY && gewijzigd > 0) console.log('Draai nu `npm run backup-kv` om de lokale snapshot bij te werken.')
