import type { AdminGroep, GroepenRegister, GroepScoreMap, GroepSfeerMap, GroepStats, GroepTent } from '#shared/groep'
import { GROEPEN_KEY, isAdminGroep, scoresKey, sfeerKey, statsKey, tentKey, summarizeStats } from '#shared/groep'

/** Dev-spiegel van GET /api/admin/groepen in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  const kv = devKv()
  const groepen = await kv.getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const rijen: AdminGroep[] = []
  let groepenTotaal = 0
  let likesTotaal = 0
  let actiefTotaal = 0
  for (const slug in groepen) {
    const info = groepen[slug]!
    const admin = isAdminGroep(info)
    const [scores, sfeer, tent, stats] = await Promise.all([
      kv.getItem<GroepScoreMap>(scoresKey(slug)),
      kv.getItem<GroepSfeerMap>(sfeerKey(slug)),
      kv.getItem<GroepTent>(tentKey(slug)),
      kv.getItem<GroepStats>(statsKey(slug))
    ])
    const scoreLijst = scores ? Object.values(scores) : []
    const likes = scoreLijst.filter(s => s.status === 'scored').length
    const samenvatting = summarizeStats(stats)
    rijen.push({
      slug,
      naam: info.naam,
      t: info.t,
      admin,
      likes,
      suggestions: scoreLijst.filter(s => s.status === 'suggested').length,
      sfeer: sfeer ? Object.keys(sfeer).length : 0,
      tent: tent != null,
      ...samenvatting
    })
    // de beheergroep blijft in de lijst zichtbaar, maar telt niet mee in de
    // totalen — die beschrijven de echte vriendengroepen (idem /api/admin/likes)
    if (admin) continue
    groepenTotaal++
    likesTotaal += likes
    if (samenvatting.active) actiefTotaal++
  }
  rijen.sort((a, b) => b.t - a.t)
  return { groepen: rijen, totaal: { groepen: groepenTotaal, likes: likesTotaal, active: actiefTotaal } }
})
