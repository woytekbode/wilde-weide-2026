import { GROEP_LS_KEY, GROEP_NAAM_LS_KEY } from '#shared/groep'

const SID_LS_KEY = 'ww-sid'
const VISIT_LS_PREFIX = 'ww-visit:'
/** niet vaker dan eens per 30 min per groep een visit-ping (KV-schrijfacties laag houden) */
const VISIT_THROTTLE_MS = 30 * 60 * 1000

/**
 * Pseudonieme, willekeurige sessie-id per apparaat (localStorage). Puur om de
 * groepsgrootte ruw te schatten; bevat geen persoonlijke gegevens en wordt nooit
 * over groepen heen gekoppeld.
 */
export function sessieId(): string {
  if (!import.meta.client) return ''
  let sid = localStorage.getItem(SID_LS_KEY)
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    localStorage.setItem(SID_LS_KEY, sid)
  }
  return sid
}

/** true als deze groep binnen het throttle-venster al gepingd is */
export function visitRecent(slug: string): boolean {
  if (!import.meta.client) return true
  try {
    const last = Number(localStorage.getItem(VISIT_LS_PREFIX + slug) ?? 0)
    return Date.now() - last < VISIT_THROTTLE_MS
  } catch {
    return false
  }
}

/** onthoud dat we zojuist een visit-ping voor deze groep verstuurd hebben */
export function markVisit(slug: string): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(VISIT_LS_PREFIX + slug, String(Date.now()))
  } catch { /* storage vol/geblokkeerd: dan pingen we gewoon vaker */ }
}

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
