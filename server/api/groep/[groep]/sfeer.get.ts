import type { GroepSfeerMap } from '#shared/groep'
import { sfeerKey } from '#shared/groep'

/** Dev-spiegel van GET /api/groep/:slug/sfeer in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)
  return await devKv().getItem<GroepSfeerMap>(sfeerKey(slug)) ?? {}
})
