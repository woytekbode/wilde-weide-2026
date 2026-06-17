import type { GroepTent } from '#shared/groep'
import { tentKey } from '#shared/groep'

/** Dev-spiegel van GET /api/groep/:slug/tent in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)
  return await devKv().getItem<GroepTent>(tentKey(slug)) ?? null
})
