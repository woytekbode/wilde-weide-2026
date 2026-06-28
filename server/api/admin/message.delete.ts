import { MESSAGE_KEY } from '#shared/message'

/** Dev-spiegel van DELETE /api/admin/message in worker/index.ts */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  await devKv().removeItem(MESSAGE_KEY)
  return { ok: true }
})
