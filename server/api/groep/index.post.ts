import type { GroepenRegister } from '#shared/groep'
import { GROEPEN_KEY, groepSlug, isGeldigeGroepSlug } from '#shared/groep'

/**
 * Dev-spiegel van POST /api/groep in worker/index.ts: join-or-create.
 * Alleen beschikbaar tijdens `npm run dev`; live draait de worker.
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }

  const body = await readBody<{ naam?: string }>(event)
  const naam = typeof body?.naam === 'string' ? body.naam.trim() : ''
  if (naam.length < 2 || naam.length > 40) {
    throw createError({ statusCode: 400, statusMessage: 'naam moet 2 tot 40 tekens zijn' })
  }
  const slug = groepSlug(naam)
  if (!isGeldigeGroepSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: 'naam moet minstens 2 letters of cijfers bevatten' })
  }

  const groepen = await devKv().getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const bestaand = groepen[slug]
  if (bestaand) {
    return { slug, naam: bestaand.naam, bestond: true }
  }
  groepen[slug] = { naam, t: Date.now() }
  await devKv().setItem(GROEPEN_KEY, groepen)
  return { slug, naam, bestond: false }
})
