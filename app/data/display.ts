import type { DayKey, Programme } from '~/types/program'
import program from '~/data/wildeweide-programma-totaal.json'

const sfeerProgram = program.sfeermakers

export interface DayMeta {
  key: DayKey
  label: string
  shortLabel: string
  date: string
  /** volle paginakleur, zoals wildeweide.nl per pagina doet */
  bg: string
  /** accent voor blokken/badges */
  accent: string
  accentSoft: string
  /** CSS-variabele voor .ww-btn-active e.d. */
  accentVar: string
}

export const DAY_META: DayMeta[] = [
  {
    // campingdag vóór het festival; deelt nu de groene veld-kleur met zondag
    key: 'donderdag',
    label: 'Donderdag 2 juli',
    shortLabel: 'do',
    date: '2026-07-02',
    bg: 'bg-veld-500',
    accent: 'bg-veld-500',
    accentSoft: 'bg-veld-200',
    accentVar: 'var(--color-veld-500)'
  },
  {
    key: 'vrijdag',
    label: 'Vrijdag 3 juli',
    shortLabel: 'vr',
    date: '2026-07-03',
    bg: 'bg-lila-500',
    accent: 'bg-lila-500',
    accentSoft: 'bg-lila-200',
    accentVar: 'var(--color-lila-500)'
  },
  {
    key: 'zaterdag',
    label: 'Zaterdag 4 juli',
    shortLabel: 'za',
    date: '2026-07-04',
    bg: 'bg-oker-500',
    accent: 'bg-oker-500',
    accentSoft: 'bg-oker-200',
    accentVar: 'var(--color-oker-500)'
  },
  {
    key: 'zondag',
    label: 'Zondag 5 juli',
    shortLabel: 'zo',
    date: '2026-07-05',
    bg: 'bg-veld-500',
    accent: 'bg-veld-500',
    accentSoft: 'bg-veld-200',
    accentVar: 'var(--color-veld-500)'
  }
]

/**
 * Knoppen van de hartjes-selector, gedeeld door acts/tabel-filter en blokkenschema.
 * `label` is tekst (alleen 'alle'); `hearts` rendert via <HeartMarks> als SVG zodat
 * de hartjes cross-platform even groot zijn (zie HeartMarks.vue).
 */
export const SCORE_OPTIONS: {
  value: number
  title: string
  label?: string
  hearts?: { filled?: number; tip?: boolean }
}[] = [
  { value: 0, label: 'alle', title: 'alle acts' },
  { value: 0.5, hearts: { tip: true }, title: 'tips + alles met hartjes' },
  { value: 1, hearts: { filled: 1 }, title: 'minstens 1 hartje' },
  { value: 2, hearts: { filled: 2 }, title: 'minstens 2 hartjes' },
  { value: 3, hearts: { filled: 3 }, title: 'alleen 3 hartjes' }
]

export const STAGE_COLORS: Record<string, string> = {
  'Bamboebos': 'bg-veld-300',
  'Bud x Lodge': 'bg-[#a3c2cf]',
  'De Baan': 'bg-rose-300',
  'Kas': 'bg-lila-300',
  'Strand': 'bg-oker-300',
  'WildLive': 'bg-[#ddacc0]',
  'Ambrosia': 'bg-[#a7c5bb]',
  'Hutje Mutje': 'bg-[#e1a87d]',
  'Tanker': 'bg-[#d07a5a]',
  // alleen op de donderdag (camping); hergebruikt het blauw van Bud x Lodge,
  // dat die dag niet open is — botst dus nergens
  'De Spot': 'bg-[#a3c2cf]',
  // takeover-collectief zonder vast tijdslot/plek: staat nooit als kolom in het
  // blokkenschema (geen dag-acts), dus de kleur botst nergens — alleen op kaarten
  'House of Chi': 'bg-[#c8b6e2]'
}

/**
 * Korte weergavenamen voor podia met een lange naam, alleen voor de chips in het
 * blokkenschema (kolomkop + filterbalk): die staan in een vaste kolombreedte, dus
 * een lange naam wrapt naar twee regels en rekt — via grid-stretch — álle chips
 * even hoog uit. `stage` zelf (de sleutel voor matching, kleuren en scores) blijft
 * ongewijzigd; de volledige naam staat in de tooltip. StageBadge (kaarten/stats/
 * slideover) groeit in breedte i.p.v. hoogte en toont gewoon de volledige naam.
 */
export const STAGE_LABELS: Record<string, string> = {
  'Radio de Koperen Hond': 'Koperen Hond'
}

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? stage
}

/**
 * Sfeermaker-programma hergebruikt de muziekpaletten (de twee schema's worden
 * nooit samen getoond): de i-de sfeerstage/-categorie krijgt de i-de kleur uit
 * STAGE_COLORS / GENRE_COLORS. Op naam-index, zodat de kleuren stabiel zijn.
 */
const STAGE_PALETTE = Object.values(STAGE_COLORS)
const SFEER_STAGE_COLORS: Record<string, string> = Object.fromEntries(
  (sfeerProgram.festival.stages as string[]).map((s, i) => [s, STAGE_PALETTE[i % STAGE_PALETTE.length]!])
)

export function stageColor(stage: string, programme: Programme = 'muziek'): string {
  const map = programme === 'sfeermakers' ? SFEER_STAGE_COLORS : STAGE_COLORS
  return map[stage] ?? 'bg-stone-300'
}

/** Badge-kleuren per genre-bucket (lichte vulling + zwarte rand). Geput uit het
   stage-palet hierboven, zodat de hele app één samenhangend kleurenschema deelt:
   elke unieke stage-kleur wordt precies één keer aan een genre toegekend. */
export const GENRE_COLORS: Record<string, string> = {
  'cabaret & theater': 'bg-[#a7c5bb]',
  'electronic & dance': 'bg-lila-300',
  'rock & punk': 'bg-rose-300',
  'hiphop': 'bg-[#a3c2cf]',
  'latin & caribbean': 'bg-oker-300',
  'jazz & klassiek': 'bg-[#e1a87d]',
  'folk & songwriter': 'bg-veld-300',
  'soul funk & disco': 'bg-[#d07a5a]',
  'pop & indie': 'bg-[#ddacc0]'
}

const GENRE_PALETTE = Object.values(GENRE_COLORS)
const SFEER_GENRE_COLORS: Record<string, string> = Object.fromEntries(
  (sfeerProgram.festival.categories as string[]).map((c, i) => [c, GENRE_PALETTE[i % GENRE_PALETTE.length]!])
)

export function genreColor(genre: string, programme: Programme = 'muziek'): string {
  const map = programme === 'sfeermakers' ? SFEER_GENRE_COLORS : GENRE_COLORS
  return map[genre] ?? 'bg-stone-300'
}

/** minuten sinds 00:00 van de festivaldag → 'HH:MM' op de klok */
export function minToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** minuten sinds 00:00 → tweecijferig uur voor de tijdschaal ('12', '02', '00') */
export function minToHour(min: number): string {
  return String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, '0')
}

export type TimeStatus = 'past' | 'now' | 'future'

/** null zolang de klok nog niet gezet is (SSR / vóór hydration) */
export function actTimeStatus(act: { start: string, end: string }, nowMs: number | null): TimeStatus | null {
  if (nowMs === null) return null
  if (nowMs >= new Date(act.end).getTime()) return 'past'
  if (nowMs >= new Date(act.start).getTime()) return 'now'
  return 'future'
}

/** de festivaldag van dit moment; nachten tot 06:00 horen bij de vorige dag */
export function festivalDayKeyFor(nowMs: number): DayKey | null {
  const d = new Date(nowMs - 6 * 3600_000)
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return DAY_META.find(m => m.date === iso)?.key ?? null
}
