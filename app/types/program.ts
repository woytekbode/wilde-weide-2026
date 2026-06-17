export type ActStatus = 'scored' | 'suggested' | 'unscored'

export interface SourceAct {
  time: string
  start: string
  end: string
  stage: string
  artist: string
  /** gevuld als de act onderdeel is van een hosting-blok */
  host: string | null
  /** format uit festival.types; null als zelfs dat onbekend is (mystery-act) */
  type: string | null
  /** brede filter-bucket uit festival.genres; null bij concept-/hosting-acts */
  genre: string | null
  /** precieze typering binnen het genre */
  style: string | null
  /** reputatie 1-3 (sterren), alleen extra context */
  liveRep: number | null
  liveImpression: string | null
  description: string | null
  country: string | null
  /** naam van de curator; letterlijk 'curator' = is zelf curator */
  curator: string | null
  spotify: string | null
}

export interface FestivalDay {
  day: string
  date: string
  acts: SourceAct[]
}

export interface Program {
  festival: {
    name: string
    dates: string
    location: string
    stages: string[]
    types: string[]
    genres: string[]
    legend: Record<string, string>
  }
  days: FestivalDay[]
}

export type DayKey = 'donderdag' | 'vrijdag' | 'zaterdag' | 'zondag'

export interface Act extends SourceAct {
  id: string
  dayKey: DayKey
  dayLabel: string
  dayDate: string
  /** minuten sinds 00:00 van de festivaldag; na middernacht > 1440 */
  startMin: number
  endMin: number
  /** groepsscore 1-3 (hartjes), null = geen score; komt uit KV, niet uit de JSON */
  score: number | null
  status: ActStatus
}

export interface Conflict {
  dayKey: DayKey
  acts: Act[]
  /** overlapvenster van het cluster, in minuten sinds 00:00 van de festivaldag */
  from: number
  to: number
}
