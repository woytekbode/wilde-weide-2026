import type { GroepenRegister } from '#shared/groep'
import { GROEPEN_KEY, isAdminGroep, isGeldigeGroepSlug, scoresKey, sfeerKey } from '#shared/groep'

/** Dev-spiegel van DELETE /api/admin/groep/:slug in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  const slug = getRouterParam(event, 'groep') ?? ''
  if (!isGeldigeGroepSlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'groep bestaat niet' })
  }
  const kv = devKv()
  const groepen = await kv.getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const info = groepen[slug]
  if (!info) {
    throw createError({ statusCode: 404, statusMessage: 'groep bestaat niet' })
  }
  if (isAdminGroep(info)) {
    throw createError({ statusCode: 400, statusMessage: 'beheergroep kan niet verwijderd worden' })
  }
  await kv.removeItem(scoresKey(slug))
  await kv.removeItem(sfeerKey(slug))
  delete groepen[slug]
  await kv.setItem(GROEPEN_KEY, groepen)
  return { ok: true }
})
