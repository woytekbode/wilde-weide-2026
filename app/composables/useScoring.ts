import type { Act } from '~/types/program'

/**
 * Hartjes-scoring per groep. De klik werkt direct door in de UI; persistentie
 * via /api/groep/<slug>/scores — in dev de Nitro-mock (.data/kv), live de
 * worker (Cloudflare KV), met dezelfde URL en blob-vorm.
 */
export function useScoring() {
  const canEdit = true
  const { groep } = useGroep()

  async function setScore(act: Act, score: number) {
    if (act.score === score) return
    const previous = { score: act.score, status: act.status }
    act.score = score
    act.status = 'scored'
    try {
      await $fetch(`/api/groep/${groep.value}/scores`, {
        method: 'POST',
        body: { id: act.id, score }
      })
    } catch (err) {
      act.score = previous.score
      act.status = previous.status
      console.error('score opslaan mislukt', err)
      useToast().add({ title: 'Score opslaan mislukt', color: 'error' })
    }
  }

  /** markeert een act als suggestie (?) of haalt die markering weg */
  async function setSuggested(act: Act, suggested: boolean) {
    const previous = { score: act.score, status: act.status }
    act.score = null
    act.status = suggested ? 'suggested' : 'unscored'
    try {
      await $fetch(`/api/groep/${groep.value}/scores`, {
        method: 'POST',
        body: { id: act.id, suggested }
      })
    } catch (err) {
      act.score = previous.score
      act.status = previous.status
      console.error('suggestie opslaan mislukt', err)
      useToast().add({ title: 'Suggestie opslaan mislukt', color: 'error' })
    }
  }

  return { canEdit, setScore, setSuggested }
}
