import type { Act } from '~/types/program'
import { useProgramme } from '~/composables/useActs'

/**
 * Eén gedeelde detail-slideover (in de layout), te openen vanuit elke view.
 *
 * De geopende act staat als ?act=<id> in de URL: de detail is zo deelbaar en
 * overleeft een reload. De URL is de bron van waarheid — `act` en `open` worden
 * eruit afgeleid i.p.v. in aparte state gespiegeld, zodat niets (een groepswissel
 * die de slideover reset, de hydration-bounce naar de kale URL, …) ze stiekem uit
 * sync kan trekken.
 */
export function useActDetails() {
  const route = useRoute()
  const router = useRouter()
  const muziek = useProgramme('muziek').acts
  const sfeer = useProgramme('sfeermakers').acts

  /** zoek een act op id over beide programma's */
  function findAct(id: string): Act | undefined {
    return muziek.value.find(a => a.id === id) ?? sfeer.value.find(a => a.id === id)
  }

  const act = computed<Act | null>(() => {
    const id = route.query.act
    if (typeof id !== 'string' || !id) return null
    // niet gevonden (data gewijzigd sinds de link): laat de slideover dicht,
    // de ?act blijft onschadelijk in de URL staan
    return findAct(id) ?? null
  })

  const open = computed<boolean>({
    get: () => act.value !== null,
    // alleen het sluiten haalt ?act weg; openen gaat via show()
    set: (value) => {
      if (!value && route.query.act) {
        router.push({ query: { ...route.query, act: undefined } })
      }
    }
  })

  function show(a: Act) {
    // push (geen replace) zodat browser-terug de slideover sluit
    if (route.query.act !== a.id) {
      router.push({ query: { ...route.query, act: a.id } })
    }
  }

  return { act, open, show, findAct }
}
