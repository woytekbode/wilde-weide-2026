import type { DayKey } from '~/types/program'

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
    // campingdag vóór het festival; deelt de lila paginakleur met vrijdag
    key: 'donderdag',
    label: 'Donderdag 2 juli',
    shortLabel: 'do',
    date: '2026-07-02',
    bg: 'bg-lila-500',
    accent: 'bg-lila-500',
    accentSoft: 'bg-lila-200',
    accentVar: 'var(--color-lila-500)'
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

/** knoppen van de hartjes-selector, gedeeld door acts/tabel-filter en blokkenschema */
export const SCORE_OPTIONS = [
  { value: 0, label: 'alle', title: 'alle acts' },
  { value: 0.5, label: '♡♡♡', title: 'tips + alles met hartjes' },
  { value: 1, label: '♥', title: 'minstens ♥' },
  { value: 2, label: '♥♥', title: 'minstens ♥♥' },
  { value: 3, label: '♥♥♥', title: 'alleen ♥♥♥' }
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
  'De Spot': 'bg-[#a3c2cf]'
}

export function stageColor(stage: string): string {
  return STAGE_COLORS[stage] ?? 'bg-stone-300'
}

/** Badge-kleuren per genre-bucket (lichte vulling + zwarte rand) */
export const GENRE_COLORS: Record<string, string> = {
  'cabaret & theater': 'bg-teal-200',
  'electronic & dance': 'bg-lila-300',
  'rock & punk': 'bg-rose-300',
  'hiphop': 'bg-sky-300',
  'latin & caribbean': 'bg-oker-300',
  'jazz & klassiek': 'bg-indigo-200',
  'folk & songwriter': 'bg-veld-300',
  'soul funk & disco': 'bg-orange-300',
  'pop & indie': 'bg-pink-200'
}

export function genreColor(genre: string): string {
  return GENRE_COLORS[genre] ?? 'bg-stone-300'
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
