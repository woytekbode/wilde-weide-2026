import type { GroepTent } from '#shared/groep'
import { tentKey } from '#shared/groep'

/** Dev-spiegel van POST /api/groep/:slug/tent in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)

  const body = await readBody<{ fx?: number, fy?: number, clear?: boolean }>(event)
  const key = tentKey(slug)

  // clear:true haalt de gedeelde tent weg
  if (body?.clear === true) {
    await devKv().removeItem(key)
    return null
  }

  const { fx, fy } = body ?? {}
  if (typeof fx !== 'number' || typeof fy !== 'number' || fx < 0 || fx > 1 || fy < 0 || fy > 1) {
    throw createError({ statusCode: 400, statusMessage: 'fx en fy moeten tussen 0 en 1 liggen' })
  }

  const tent: GroepTent = { fx, fy, t: Date.now() }
  await devKv().setItem(key, tent)
  return tent
})
