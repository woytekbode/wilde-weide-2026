import type { H3Event } from 'h3'
import type { GroepenRegister } from '#shared/groep'
import { GROEPEN_KEY, isGeldigeGroepSlug } from '#shared/groep'

/**
 * Dev-KV: zelfde blob-vormen als worker/index.ts, maar dan op schijf in
 * .data/kv (Nitro's fs-storage). Alleen gebruikt door de dev-only routes.
 */
export function devKv() {
  return useStorage('data')
}

/** dev-spiegel van vereisAdmin in worker/index.ts: fail closed zonder token */
export function vereisAdmin(event: H3Event): void {
  const token = process.env.ADMIN_TOKEN
  if (!token || getHeader(event, 'x-admin-token') !== token) {
    throw createError({ statusCode: 401, statusMessage: 'unauthorized' })
  }
}

/** valideert de slug uit de route en eist dat de groep in het register staat */
export async function vereisGroep(event: H3Event): Promise<{ slug: string, naam: string }> {
  const slug = getRouterParam(event, 'groep') ?? ''
  if (!isGeldigeGroepSlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'groep bestaat niet' })
  }
  const groepen = await devKv().getItem<GroepenRegister>(GROEPEN_KEY) ?? {}
  const groep = groepen[slug]
  if (!groep) {
    throw createError({ statusCode: 404, statusMessage: 'groep bestaat niet' })
  }
  return { slug, naam: groep.naam }
}
