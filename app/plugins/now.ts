import { festivalDayKeyFor } from '~/data/display'
import type { DayKey } from '~/types/program'

/**
 * Zet de gedeelde klok. Met ?fakenow=2026-07-04T18:30:00 staat de klok vast
 * op dat moment (handig om de weekend-weergave te testen, ook op de live
 * site). In dev rendert de server fakenow ook al mee; de statische build
 * doet alles client-side. Tijdens het weekend wordt meteen de festivaldag
 * van vandaag voorgeselecteerd.
 *
 * Let op: in de app:mounted-callback geen composables gebruiken — die context
 * is daar weg; alle state-refs worden hier tijdens setup vastgepakt.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const now = useNow()
  // bevroren klok: gezet door ?fakenow of de klok-knop (useFakeNow). Zolang dit
  // aanstaat overschrijft de minuut-tik de klok niet.
  const frozen = useState<boolean>('now-frozen', () => false)
  const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')
  // route hier vastpakken: in de app:mounted-callback mag geen composable, en
  // window.location.search is tijdens het opstarten even leeg (replaceState-
  // race) — de router houdt de query wél vast
  const route = useRoute()

  function apply(nowMs: number) {
    now.value = nowMs
    const day = festivalDayKeyFor(nowMs)
    if (day) timetableDay.value = day
  }

  function parseFake(value: unknown): number | null {
    if (typeof value !== 'string' || !value) return null
    const t = new Date(value).getTime()
    return Number.isNaN(t) ? null : t
  }

  if (import.meta.server) {
    const fake = parseFake(useRequestURL().searchParams.get('fakenow'))
    if (fake !== null) {
      frozen.value = true
      apply(fake)
    }
    return
  }

  nuxtApp.hook('app:mounted', () => {
    // echte klok starten; de route-query reactief volgen, want tijdens het
    // opstarten wisselt de router even naar de kale URL en pas daarna terug
    // naar de volledige URL mét query — een eenmalige read mist die race
    apply(Date.now())
    setInterval(() => {
      // bevroren klok (fakenow-query of de klok-knop) niet overschrijven
      if (!frozen.value) now.value = Date.now()
    }, 60_000)

    watch(() => route.query.fakenow, (value) => {
      const fake = parseFake(value)
      if (fake !== null) {
        frozen.value = true
        apply(fake)
      }
    }, { immediate: true })
  })
})
