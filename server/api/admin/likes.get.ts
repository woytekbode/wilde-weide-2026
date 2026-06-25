import type { GroepenRegister, GroepScoreMap, LikeAggregateMap } from '#shared/groep'
import { GROEPEN_KEY, scoresKey } from '#shared/groep'

/** Dev-spiegel van GET /api/admin/likes in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  const kv = devKv()
  const groepen = await kv.getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const likes: LikeAggregateMap = {}
  for (const slug in groepen) {
    const scores = await kv.getItem<GroepScoreMap>(scoresKey(slug))
    if (!scores) continue
    for (const key in scores) {
      const e = scores[key]!
      const agg = (likes[key] ??= { hearts: 0, groups: 0, suggested: 0 })
      if (e.status === 'scored' && e.score) {
        agg.hearts += e.score
        agg.groups += 1
      } else if (e.status === 'suggested') {
        agg.suggested += 1
      }
    }
  }
  return { likes }
})
