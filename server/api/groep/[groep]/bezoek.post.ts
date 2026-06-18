import type { GroepStats } from '#shared/groep'
import { isGeldigeSid, statsKey } from '#shared/groep'

/** Dev-spiegel van POST /api/groep/:slug/bezoek in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)

  const body = await readBody<{ sid?: string }>(event)
  const sid = body?.sid
  if (!isGeldigeSid(sid)) {
    throw createError({ statusCode: 400, statusMessage: 'sid ontbreekt' })
  }

  const key = statsKey(slug)
  const now = Date.now()
  const stats = await devKv().getItem<GroepStats>(key) ?? { lastActive: now, visits: 0, sessies: {} }
  stats.sessies[sid] = now
  stats.lastActive = now
  stats.visits = (stats.visits ?? 0) + 1
  await devKv().setItem(key, stats)
  return { ok: true }
})
