import type { Act, DayKey } from '~/types/program'
import { actTimeStatus } from '~/data/display'

export interface ActFilters {
  search: string
  day: DayKey | 'alle'
  stages: string[]
  genres: string[]
  types: string[]
  /** drempel: 0 = alle, 0.5 = suggesties + gescoord, 1-3 = score ≥ n */
  minScore: number
  /** verberg acts die al afgelopen zijn (alleen zinvol tijdens het weekend) */
  hideFinished: boolean
}

/** drempelcheck van de score-selector: 0 = alles, 0.5 = suggesties + gescoord, 1-3 = score ≥ n */
export function passesScore(act: Act, minScore: number): boolean {
  if (minScore <= 0) return true
  if (act.score !== null && act.score >= minScore) return true
  return minScore <= 0.5 && act.status === 'suggested'
}

const defaultFilters = (): ActFilters => ({
  search: '',
  day: 'alle',
  stages: [],
  genres: [],
  types: [],
  minScore: 0,
  hideFinished: false
})

/** Gedeelde filterstatus voor tabel- en acts-weergave */
export function useFilters() {
  const filters = useState<ActFilters>('act-filters', defaultFilters)
  const now = useNow()

  function reset() {
    filters.value = defaultFilters()
  }

  function matches(act: Act): boolean {
    const f = filters.value
    if (f.hideFinished && actTimeStatus(act, now.value) === 'past') return false
    if (f.day !== 'alle' && act.dayKey !== f.day) return false
    if (f.stages.length > 0 && !f.stages.includes(act.stage)) return false
    if (f.genres.length > 0 && !(act.genre && f.genres.includes(act.genre))) return false
    if (f.types.length > 0 && !(act.type && f.types.includes(act.type))) return false
    if (!passesScore(act, f.minScore)) return false
    if (f.search) {
      const q = f.search.toLowerCase()
      if (!act.artist.toLowerCase().includes(q) && !(act.style ?? '').toLowerCase().includes(q)) return false
    }
    return true
  }

  return { filters, reset, matches }
}

export function useFilteredActs() {
  const { acts } = useActs()
  const { filters, matches } = useFilters()
  return computed(() => {
    // touch zodat de computed op alle filtervelden reageert
    void filters.value
    return acts.value.filter(matches)
  })
}
