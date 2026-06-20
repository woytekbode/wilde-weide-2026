import type { Act } from '~/types/program'
import type { GroepScoreMap, GroepTent } from '#shared/groep'
import { buildActs, buildSfeerActs, useProgramme } from '~/composables/useActs'

/**
 * Laadt bij elke groepswissel (route-param) de groepsdata uit KV over de
 * neutrale statische data heen — zelfde gedrag in dev (Nitro-mock op
 * .data/kv) en live (worker). State-refs en composables tijdens setup
 * vastpakken: in async callbacks is de composable-context weg.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const route = useRoute()
  const { acts } = useActs()
  const { acts: sfeerActs } = useProgramme('sfeermakers')
  const { tent: tentPos } = useTent()
  const { groepNaam, rememberGroep, forgetGroep } = useGroep()
  const detailsAct = useState<Act | null>('act-details', () => null)
  const detailsOpen = useState<boolean>('act-details-open', () => false)
  const toast = useToast()

  // bij snel wisselen telt alleen de laatst gestarte load
  let laadToken = 0

  async function laadGroep(slug: string) {
    const token = ++laadToken

    // schone lei: neutrale data en geen slideover met een oude Act-ref
    detailsAct.value = null
    detailsOpen.value = false
    acts.value = buildActs()
    sfeerActs.value = buildSfeerActs()
    tentPos.value = null
    groepNaam.value = ''

    let info: { slug: string, naam: string }
    try {
      info = await $fetch<{ slug: string, naam: string }>(`/api/groep/${slug}`)
    } catch (err) {
      if (token !== laadToken) return
      const status = (err as { statusCode?: number, status?: number })
      if ((status.statusCode ?? status.status) === 404) {
        forgetGroep()
        toast.add({ title: 'Groep niet gevonden', color: 'error' })
        await navigateTo('/')
      } else {
        console.warn('groep ophalen mislukt', err)
        toast.add({ title: 'Groep laden mislukt', color: 'error' })
      }
      return
    }
    if (token !== laadToken) return
    groepNaam.value = info.naam
    rememberGroep(slug, info.naam)

    // activiteits-ping (fire-and-forget, gethrottled): voedt de Badmeester-stats
    if (!visitRecent(slug)) {
      markVisit(slug)
      $fetch(`/api/groep/${slug}/visit`, { method: 'POST', body: { sid: sessieId() } })
        .catch(() => { /* stats zijn niet kritisch */ })
    }

    try {
      const [scores, tent] = await Promise.all([
        $fetch<GroepScoreMap>(`/api/groep/${slug}/scores`),
        $fetch<GroepTent | null>(`/api/groep/${slug}/tent`)
      ])
      if (token !== laadToken) return

      // één scores-blob per groep dekt beide programma's (ids zijn genamespaced)
      const byId = new Map<string, Act>([...acts.value, ...sfeerActs.value].map(a => [a.id, a]))
      for (const [id, entry] of Object.entries(scores)) {
        const act = byId.get(id)
        if (!act) continue
        if (entry.status === 'suggested') {
          act.score = null
          act.status = 'suggested'
        } else if (entry.score !== null && [0, 1, 2, 3].includes(entry.score)) {
          act.score = entry.score
          act.status = 'scored'
        }
      }
      tentPos.value = tent ? { fx: tent.fx, fy: tent.fy } : null
    } catch (err) {
      if (token !== laadToken) return
      console.warn('groepsdata laden mislukt', err)
      toast.add({ title: 'Scores laden mislukt', color: 'error' })
    }
  }

  // pas na de eerste suspense-resolve: de gegenereerde HTML is neutraal en bij
  // app:mounted kan de pagina-hydration nog bezig zijn — scores eroverheen
  // leggen geeft dan hydration-mismatches in het blokkenschema
  nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
    watch(() => route.params.groep, (g) => {
      if (typeof g === 'string' && g) laadGroep(g)
    }, { immediate: true })
  })
})
