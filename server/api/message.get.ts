import type { BroadcastMessage } from '#shared/message'
import { MESSAGE_KEY, isExpired } from '#shared/message'

/**
 * Dev-spiegel van GET /api/message in worker/index.ts — publiek (geen token,
 * geen import.meta.dev-guard zoals de admin-spiegels). Verlopen bericht → null,
 * zodat clients het nooit te zien krijgen.
 */
export default defineEventHandler(async (): Promise<BroadcastMessage | null> => {
  const msg = await devKv().getItem<BroadcastMessage>(MESSAGE_KEY)
  return isExpired(msg) ? null : msg ?? null
})
