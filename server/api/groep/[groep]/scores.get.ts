import type { GroepScoreMap } from '#shared/groep'
import { scoresKey } from '#shared/groep'

/** Dev-spiegel van GET /api/groep/:slug/scores in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)
  return await devKv().getItem<GroepScoreMap>(scoresKey(slug)) ?? {}
})
