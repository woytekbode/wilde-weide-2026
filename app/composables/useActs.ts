import program from '~/data/wildeweide-programma-totaal.json'
import type { Act, Conflict, DayKey, Program, Programme, SourceAct } from '~/types/program'

const typedMusic = program.muziek as unknown as Program

/**
 * Sfeermaker-programma: zelfde vorm als het muziekprogramma, maar met `category`
 * i.p.v. `genre` en zonder de muziek-only velden (style, liveRep, …).
 */
interface SfeerSourceAct {
  time: string
  start: string
  end: string
  stage: string
  artist: string
  host: string | null
  type: string | null
  category: string
  description: string | null
}
/** sfeermaker zonder vast tijdslot/plek: zelfde vorm, maar tijd/plek/categorie zijn null */
interface SfeerUnscheduled {
  artist: string
  host: string | null
  type: string | null
  category: string | null
  description: string | null
  time: string | null
  start: string | null
  end: string | null
  stage: string | null
}
interface SfeerProgram {
  festival: Omit<Program['festival'], 'genres'> & { categories: string[] }
  days: { day: string, date: string, acts: SfeerSourceAct[] }[]
  unscheduled?: SfeerUnscheduled[]
}
const typedSfeer = program.sfeermakers as unknown as SfeerProgram

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** sfeermaker-act → neutrale SourceAct: category wordt de genre-bucket, host die
 *  gelijk is aan de stage valt weg (anders dubbel in 'onderdeel van') */
function sfeerToSource(a: SfeerSourceAct): SourceAct {
  return {
    time: a.time,
    start: a.start,
    end: a.end,
    stage: a.stage,
    artist: a.artist,
    host: a.host && a.host !== a.stage ? a.host : null,
    type: a.type,
    genre: a.category,
    style: null,
    liveRep: null,
    liveImpression: null,
    description: a.description,
    country: null,
    curator: null,
    spotify: null
  }
}

type SourceDay = { day: string, date: string, acts: SourceAct[] }

/** neutrale acts uit statische JSON; scores/suggesties komen per groep uit KV */
function assemble(days: SourceDay[], programme: Programme, idPrefix: string): Act[] {
  const acts: Act[] = []
  for (const day of days) {
    const dayKey = day.day.split(' ')[0]!.toLowerCase() as DayKey
    const midnight = new Date(`${day.date}T00:00:00`).getTime()
    for (const src of day.acts) {
      const startMin = (new Date(src.start).getTime() - midnight) / 60000
      const endMin = (new Date(src.end).getTime() - midnight) / 60000
      const id = `${idPrefix}${dayKey}-${slugify(src.artist)}-${src.start.slice(11, 16)}`
      acts.push({
        ...src,
        id,
        // sfeermaker-activiteiten komen vaak op meerdere tijdstippen terug; één
        // score per activiteit (i.p.v. per tijdslot) via een activiteit-sleutel
        scoreKey: programme === 'sfeermakers' ? `sfeermaker-${slugify(src.artist)}` : id,
        programme,
        dayKey,
        dayLabel: day.day,
        dayDate: day.date,
        startMin,
        endMin,
        score: null,
        status: 'unscored'
      })
    }
  }
  return acts.sort((a, b) => a.dayDate.localeCompare(b.dayDate) || a.startMin - b.startMin || a.stage.localeCompare(b.stage))
}

export function buildActs(): Act[] {
  return assemble(typedMusic.days, 'muziek', '')
}

/**
 * Sfeermakers zonder tijd/plek (cocktailbar, sauna, …): timeless Acts met
 * dayKey null, dus ze vallen buiten elk dagschema (actsForDay) en de
 * conflictdetectie, maar verschijnen wél als kaart op de acts-pagina. Niet via
 * assemble(): die rekent startMin uit `start` en leidt een dayKey af.
 */
function buildUnscheduledSfeerActs(): Act[] {
  return (typedSfeer.unscheduled ?? []).map(s => ({
    id: `sfeermaker-${slugify(s.artist)}`,
    scoreKey: `sfeermaker-${slugify(s.artist)}`,
    programme: 'sfeermakers',
    artist: s.artist,
    type: s.type,
    description: s.description,
    // zelf-host weglaten zodat de slideover geen 'onderdeel van <zichzelf>' toont
    host: null,
    genre: null,
    style: null,
    liveRep: null,
    liveImpression: null,
    country: null,
    curator: null,
    spotify: null,
    time: '',
    start: '',
    end: '',
    stage: '',
    dayKey: null,
    dayLabel: '',
    dayDate: '',
    startMin: 0,
    endMin: 0,
    score: null,
    status: 'unscored',
    timeless: true
  }))
}

export function buildSfeerActs(): Act[] {
  const days: SourceDay[] = typedSfeer.days.map(d => ({
    day: d.day,
    date: d.date,
    acts: d.acts.map(sfeerToSource)
  }))
  return [...assemble(days, 'sfeermakers', 'sfeermaker-'), ...buildUnscheduledSfeerActs()]
}

interface Dataset {
  festival: Program['festival']
  build: () => Act[]
  stateKey: string
}

const DATASETS: Record<Programme, Dataset> = {
  muziek: { festival: typedMusic.festival, build: buildActs, stateKey: 'acts' },
  sfeermakers: { festival: typedSfeer.festival as unknown as Program['festival'], build: buildSfeerActs, stateKey: 'acts-sfeermakers' }
}

function overlaps(a: Act, b: Act): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}

/** dataset + helpers voor één programma; muziek en sfeermakers leven in aparte state */
export function useProgramme(programme: Programme) {
  const ds = DATASETS[programme]
  // in state zodat scores en groepswissels overal reactief doorwerken
  const acts = useState<Act[]>(ds.stateKey, ds.build)

  function actsForDay(dayKey: DayKey): Act[] {
    return acts.value.filter(a => a.dayKey === dayKey)
  }

  /**
   * Conflicten: overlappende acts op verschillende stages waar we allebei heen
   * willen. Clusters zijn samenhangende groepen van paarsgewijze overlaps.
   */
  function conflictsForDay(dayKey: DayKey, minScore: number, includeSuggested: boolean): Conflict[] {
    const candidates = actsForDay(dayKey).filter(a =>
      (a.score !== null && a.score >= minScore) || (includeSuggested && a.status === 'suggested')
    )

    const clusters: Act[][] = []
    const assigned = new Set<string>()
    for (const act of candidates) {
      if (assigned.has(act.id)) continue
      const cluster = [act]
      assigned.add(act.id)
      // breedte-eerst: alles wat met iets in het cluster overlapt hoort erbij
      for (let i = 0; i < cluster.length; i++) {
        for (const other of candidates) {
          if (assigned.has(other.id)) continue
          if (other.stage !== cluster[i]!.stage && overlaps(cluster[i]!, other)) {
            cluster.push(other)
            assigned.add(other.id)
          }
        }
      }
      if (cluster.length > 1) clusters.push(cluster.sort((a, b) => a.startMin - b.startMin))
    }

    return clusters.map(clusterActs => ({
      dayKey,
      acts: clusterActs,
      from: Math.min(...clusterActs.map(a => a.startMin)),
      to: Math.max(...clusterActs.map(a => a.endMin))
    })).sort((a, b) => a.from - b.from)
  }

  /** ids van acts die in een conflict zitten, voor markering in het blokkenschema */
  function conflictActIds(dayKey: DayKey, minScore: number, includeSuggested: boolean): Set<string> {
    const ids = new Set<string>()
    for (const c of conflictsForDay(dayKey, minScore, includeSuggested)) {
      for (const a of c.acts) ids.add(a.id)
    }
    return ids
  }

  return {
    festival: ds.festival,
    acts,
    stages: ds.festival.stages,
    actsForDay,
    conflictActIds
  }
}

/** muziekprogramma (default); bestaande callers blijven werken */
export function useActs() {
  return useProgramme('muziek')
}
