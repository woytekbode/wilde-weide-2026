import program from '~/data/wildeweide-programma.json'
import type { Act, Conflict, DayKey, Program } from '~/types/program'
import { DAY_META } from '~/data/display'

const typedProgram = program as unknown as Program

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** neutrale acts uit de statische JSON; scores/suggesties komen per groep uit KV */
export function buildActs(): Act[] {
  const acts: Act[] = []
  for (const day of typedProgram.days) {
    const dayKey = day.day.split(' ')[0]!.toLowerCase() as DayKey
    const midnight = new Date(`${day.date}T00:00:00`).getTime()
    for (const src of day.acts) {
      const startMin = (new Date(src.start).getTime() - midnight) / 60000
      const endMin = (new Date(src.end).getTime() - midnight) / 60000
      acts.push({
        ...src,
        id: `${dayKey}-${slugify(src.artist)}-${src.start.slice(11, 16)}`,
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

function overlaps(a: Act, b: Act): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}

export function useActs() {
  // in state zodat scores en groepswissels overal reactief doorwerken
  const acts = useState<Act[]>('acts', buildActs)

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
    festival: typedProgram.festival,
    acts,
    stages: typedProgram.festival.stages,
    actsForDay,
    conflictActIds
  }
}
