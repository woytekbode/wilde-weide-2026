import type { GroepSfeerMap } from '#shared/groep'
import { sfeerKey } from '#shared/groep'

/** Dev-spiegel van POST /api/groep/:slug/sfeer in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  const { slug } = await vereisGroep(event)

  const body = await readBody<{ id?: string, liked?: boolean }>(event)
  const { id, liked } = body ?? {}
  if (typeof id !== 'string' || !id) {
    throw createError({ statusCode: 400, statusMessage: 'id ontbreekt' })
  }
  if (typeof liked !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'liked moet true of false zijn' })
  }

  const key = sfeerKey(slug)
  const likes = await devKv().getItem<GroepSfeerMap>(key) ?? {}
  if (liked) {
    likes[id] = { t: Date.now() }
  } else {
    delete likes[id]
  }
  await devKv().setItem(key, likes)
  return likes
})
