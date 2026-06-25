import type { GroepenRegister, GroepScoreMap, GroepStats, LikeAggregateMap, StatsResponse } from '#shared/groep'
import { GROEPEN_KEY, scoresKey, statsKey, summarizeStats } from '#shared/groep'

/**
 * Dev-spiegel van GET /api/stats in worker/index.ts — publiek (geen token,
 * geen import.meta.dev-guard zoals de admin-spiegels). Uitsluitend
 * geaggregeerde, niet-persoonlijke cijfers; nooit het per-groep register.
 */
export default defineEventHandler(async (): Promise<StatsResponse> => {
  const kv = devKv()
  const groepen = await kv.getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const likes: LikeAggregateMap = {}
  let likesTotaal = 0
  let actiefTotaal = 0
  for (const slug in groepen) {
    const [scores, stats] = await Promise.all([
      kv.getItem<GroepScoreMap>(scoresKey(slug)),
      kv.getItem<GroepStats>(statsKey(slug))
    ])
    if (summarizeStats(stats).active) actiefTotaal++
    if (!scores) continue
    for (const key in scores) {
      const e = scores[key]!
      if (e.status === 'scored') likesTotaal += 1
      const agg = (likes[key] ??= { hearts: 0, groups: 0, suggested: 0 })
      if (e.status === 'scored' && e.score) {
        agg.hearts += e.score
        agg.groups += 1
      } else if (e.status === 'suggested') {
        agg.suggested += 1
      }
    }
  }
  return {
    totaal: { groepen: Object.keys(groepen).length, likes: likesTotaal, active: actiefTotaal },
    likes
  }
})
