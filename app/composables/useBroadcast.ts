import type { BroadcastMessage } from '#shared/message'

const SEEN_LS_KEY = 'ww-message-seen'

/**
 * Het globale festivalbericht (in de layout). Wordt runtime opgehaald uit KV en
 * verschijnt eenmalig per apparaat, totdat de badmeester een nieuw bericht
 * verstuurt (nieuw id → opnieuw tonen). Zelfde one-time-localStorage-truc als
 * useLegend, fail open: bij onleesbare storage tonen we hooguit nog eens.
 */
export function useBroadcast() {
  const message = useState<BroadcastMessage | null>('broadcast-message', () => null)
  const open = useState<boolean>('broadcast-open', () => false)

  async function fetchMessage() {
    try {
      message.value = await $fetch<BroadcastMessage | null>('/api/message')
    } catch { /* offline of fout: laat het huidige bericht staan */ }
  }

  function seenId(): string {
    try {
      return localStorage.getItem(SEEN_LS_KEY) ?? ''
    } catch {
      return ''
    }
  }

  function markSeen(id: string) {
    try {
      localStorage.setItem(SEEN_LS_KEY, id)
    } catch { /* niet erg: bericht kan dan nog eens opduiken */ }
  }

  return { message, open, fetchMessage, seenId, markSeen }
}
