import { festivalDayKeyFor } from '~/data/display'
import type { DayKey } from '~/types/program'

/**
 * Neptijd-knop (klok in de header). Zet de gedeelde klok op een willekeurig
 * moment waarop er ook echt acts spelen — uniform getrokken uit de vereniging
 * van alle act-vensters, dus nooit in een dode nacht-gat (geen zaterdag 04:00) —
 * en bevriest hem daar, zodat je de weekend-weergave (nu/straks/geweest,
 * vandaag voorgeselecteerd) kunt bekijken.
 *
 * Levensduur: de staat leeft in useState en blijft dus staan terwijl je tussen
 * pagina's klikt. Een harde refresh of de site opnieuw openen zet hem uit (de
 * echte klok loopt dan weer). Nog eens op de knop tikken zet hem ook weer uit.
 */
export function useFakeNow() {
  const now = useNow()
  const frozen = useState<boolean>('now-frozen', () => false)
  const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')
  const { acts } = useActs()

  function applyAt(ms: number) {
    now.value = ms
    const day = festivalDayKeyFor(ms)
    if (day) timetableDay.value = day
  }

  /**
   * Willekeurig moment waarop er acts spelen, en daar bevriezen. De act-vensters
   * worden samengevoegd tot losse blokken (overlap/aansluitend = één blok); dan
   * trekken we uniform over de totale speelduur, zodat de kans evenredig is en de
   * gaten tussen blokken (de nachten) overgeslagen worden.
   */
  function activateRandom() {
    const sorted = acts.value
      .map(a => [new Date(a.start).getTime(), new Date(a.end).getTime()] as const)
      .sort((x, y) => x[0] - y[0])

    const blocks: { start: number, end: number }[] = []
    for (const [start, end] of sorted) {
      const last = blocks[blocks.length - 1]
      if (last && start <= last.end) last.end = Math.max(last.end, end)
      else blocks.push({ start, end })
    }

    const total = blocks.reduce((sum, b) => sum + (b.end - b.start), 0)
    let offset = Math.random() * total
    let ms = blocks[blocks.length - 1]!.end
    for (const b of blocks) {
      const len = b.end - b.start
      if (offset < len) { ms = b.start + offset; break }
      offset -= len
    }

    frozen.value = true
    applyAt(Math.round(ms))
  }

  /** terug naar de echte klok */
  function clear() {
    frozen.value = false
    applyAt(Date.now())
  }

  function toggle() {
    if (frozen.value) clear()
    else activateRandom()
  }

  return { frozen, toggle, activateRandom, clear }
}
