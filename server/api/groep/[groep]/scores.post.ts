import type { GroepScoreMap } from '#shared/groep'
import { scoresKey } from '#shared/groep'

/** Dev-spiegel van POST /api/groep/:slug/scores in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)

  const body = await readBody<{ id?: string, score?: number | null, suggested?: boolean }>(event)
  const { id, score, suggested } = body ?? {}
  if (typeof id !== 'string' || !id) {
    throw createError({ statusCode: 400, statusMessage: 'id ontbreekt' })
  }

  const key = scoresKey(slug)
  const scores = await devKv().getItem<GroepScoreMap>(key) ?? {}
  if (typeof suggested === 'boolean') {
    if (suggested) {
      scores[id] = { score: null, status: 'suggested', t: Date.now() }
    } else {
      delete scores[id]
    }
  } else {
    // null verwijdert de score; 0 = beoordeeld, niet voor ons
    if (score !== null && score !== 0 && score !== 1 && score !== 2 && score !== 3) {
      throw createError({ statusCode: 400, statusMessage: 'score moet 0, 1, 2, 3 of null zijn' })
    }
    if (score === null) {
      delete scores[id]
    } else {
      scores[id] = { score, status: 'scored', t: Date.now() }
    }
  }
  await devKv().setItem(key, scores)
  return scores
})
