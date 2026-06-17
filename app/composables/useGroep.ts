import { GROEP_LS_KEY, GROEP_NAAM_LS_KEY } from '#shared/groep'

/** actieve groep (uit de route) + de laatst gebruikte groep in localStorage */
export function useGroep() {
  const route = useRoute()

  const groep = computed(() => {
    const p = route.params.groep
    return typeof p === 'string' ? p : ''
  })

  /** weergavenaam van de actieve groep, gezet door plugins/groep.client.ts */
  const groepNaam = useState<string>('groep-naam', () => '')

  function rememberGroep(slug: string, naam: string) {
    if (!import.meta.client) return
    localStorage.setItem(GROEP_LS_KEY, slug)
    localStorage.setItem(GROEP_NAAM_LS_KEY, naam)
  }

  function lastGroep(): { slug: string, naam: string } | null {
    if (!import.meta.client) return null
    const slug = localStorage.getItem(GROEP_LS_KEY)
    if (!slug) return null
    return { slug, naam: localStorage.getItem(GROEP_NAAM_LS_KEY) ?? slug }
  }

  function forgetGroep() {
    if (!import.meta.client) return
    localStorage.removeItem(GROEP_LS_KEY)
    localStorage.removeItem(GROEP_NAAM_LS_KEY)
  }

  return { groep, groepNaam, rememberGroep, lastGroep, forgetGroep }
}
