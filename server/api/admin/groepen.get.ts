import type { AdminGroep, GroepenRegister, GroepScoreMap } from '#shared/groep'
import { GROEPEN_KEY, isAdminGroep, scoresKey } from '#shared/groep'

/** Dev-spiegel van GET /api/admin/groepen in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  const kv = devKv()
  const groepen = await kv.getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const rijen: AdminGroep[] = []
  let likesTotaal = 0
  for (const slug in groepen) {
    const info = groepen[slug]!
    const scores = await kv.getItem<GroepScoreMap>(scoresKey(slug)) ?? {}
    const likes = Object.values(scores).filter(s => s.status === 'scored').length
    likesTotaal += likes
    rijen.push({ slug, naam: info.naam, t: info.t, admin: isAdminGroep(info), likes })
  }
  rijen.sort((a, b) => b.t - a.t)
  return { groepen: rijen, totaal: { groepen: rijen.length, likes: likesTotaal } }
})
