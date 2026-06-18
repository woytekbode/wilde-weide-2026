import type { AdminGroep, GroepenRegister, GroepScoreMap, GroepSfeerMap, GroepStats, GroepTent } from '#shared/groep'
import { GROEPEN_KEY, isAdminGroep, scoresKey, sfeerKey, statsKey, tentKey, vatStatsSamen } from '#shared/groep'

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
  let actiefTotaal = 0
  for (const slug in groepen) {
    const info = groepen[slug]!
    const [scores, sfeer, tent, stats] = await Promise.all([
      kv.getItem<GroepScoreMap>(scoresKey(slug)),
      kv.getItem<GroepSfeerMap>(sfeerKey(slug)),
      kv.getItem<GroepTent>(tentKey(slug)),
      kv.getItem<GroepStats>(statsKey(slug))
    ])
    const scoreLijst = scores ? Object.values(scores) : []
    const likes = scoreLijst.filter(s => s.status === 'scored').length
    const samenvatting = vatStatsSamen(stats)
    likesTotaal += likes
    if (samenvatting.actief) actiefTotaal++
    rijen.push({
      slug,
      naam: info.naam,
      t: info.t,
      admin: isAdminGroep(info),
      likes,
      suggesties: scoreLijst.filter(s => s.status === 'suggested').length,
      sfeer: sfeer ? Object.keys(sfeer).length : 0,
      tent: tent != null,
      ...samenvatting
    })
  }
  rijen.sort((a, b) => b.t - a.t)
  return { groepen: rijen, totaal: { groepen: rijen.length, likes: likesTotaal, actief: actiefTotaal } }
})
