import type { BroadcastMessage } from '#shared/message'
import { MESSAGE_KEY, buildMessage } from '#shared/message'

/** Dev-spiegel van POST /api/admin/message in worker/index.ts */
export default defineEventHandler(async (event): Promise<BroadcastMessage> => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 })
  }
  vereisAdmin(event)

  const body = await readBody<Record<string, unknown>>(event) ?? {}
  const kv = devKv()
  const bestaand = await kv.getItem<BroadcastMessage>(MESSAGE_KEY)
  const res = buildMessage(body, bestaand, Date.now(), () => crypto.randomUUID())
  if (!res.ok) {
    throw createError({ statusCode: 400, statusMessage: res.error })
  }
  await kv.setItem(MESSAGE_KEY, res.message)
  return res.message
})
