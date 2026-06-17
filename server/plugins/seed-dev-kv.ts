import { readFile } from 'node:fs/promises'
import { GROEPEN_KEY } from '#shared/groep'

/**
 * Vult in dev een lege .data/kv met de lokale KV-backup (zie
 * scripts/backup-kv.mjs), zodat een checkout met backup realistische
 * groepsdata heeft. Alleen als het register ontbreekt — lokale experimenten
 * blijven staan; weggooien van .data/kv seedt opnieuw. De backup is
 * gitignored: zonder het bestand start dev simpelweg met een lege KV.
 */
export default defineNitroPlugin(async () => {
  if (!import.meta.dev) return

  const storage = useStorage('data')
  if (await storage.hasItem(GROEPEN_KEY)) return

  let backup: { keys: Record<string, unknown>, exportedAt: string }
  try {
    const raw = await readFile(new URL('../data/kv-backup.json', import.meta.url), 'utf8')
    backup = JSON.parse(raw)
  } catch {
    return // geen lokale backup → start met lege dev-KV
  }

  const keys = Object.entries(backup.keys as Record<string, unknown>)
  for (const [key, value] of keys) {
    await storage.setItem(key, value)
  }
  console.log(`dev-KV geseed met ${keys.length} keys uit server/data/kv-backup.json (export ${backup.exportedAt})`)
})
