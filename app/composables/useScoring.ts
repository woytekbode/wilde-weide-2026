import type { Act } from '~/types/program'

/**
 * Hartjes-scoring per groep. De klik werkt direct door in de UI; persistentie
 * via /api/groep/<slug>/scores — in dev de Nitro-mock (.data/kv), live de
 * worker (Cloudflare KV), met dezelfde URL en blob-vorm.
 */
export function useScoring() {
  const canEdit = true
  const { groep } = useGroep()
  const { acts: musicActs } = useProgramme('muziek')
  const { acts: sfeerActs } = useProgramme('sfeermakers')

  /**
   * Alle acts die dezelfde scoreKey delen binnen het programma van `act`. Voor
   * muziek is dat de act zelf; sfeermaker-activiteiten komen op meerdere
   * tijdstippen terug, dus één score moet op al die sessies doorwerken.
   */
  function siblings(act: Act): Act[] {
    const arr = act.programme === 'sfeermakers' ? sfeerActs.value : musicActs.value
    return arr.filter(a => a.scoreKey === act.scoreKey)
  }

  async function persist(act: Act, body: { score?: number, suggested?: boolean }, apply: (a: Act) => void) {
    const group = siblings(act)
    const previous = group.map(a => ({ a, score: a.score, status: a.status }))
    for (const a of group) apply(a)
    try {
      await $fetch(`/api/groep/${groep.value}/scores`, {
        method: 'POST',
        body: { id: act.scoreKey, ...body }
      })
    } catch (err) {
      for (const p of previous) { p.a.score = p.score; p.a.status = p.status }
      console.error('score opslaan mislukt', err)
      useToast().add({ title: 'Opslaan mislukt', color: 'error' })
    }
  }

  async function setScore(act: Act, score: number) {
    if (act.score === score) return
    await persist(act, { score }, (a) => { a.score = score; a.status = 'scored' })
  }

  /** markeert een act als suggestie (?) of haalt die markering weg */
  async function setSuggested(act: Act, suggested: boolean) {
    await persist(act, { suggested }, (a) => {
      a.score = null
      a.status = suggested ? 'suggested' : 'unscored'
    })
  }

  return { canEdit, setScore, setSuggested }
}
