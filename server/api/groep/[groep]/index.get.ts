/** Dev-spiegel van GET /api/groep/:slug in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  return await vereisGroep(event)
})
