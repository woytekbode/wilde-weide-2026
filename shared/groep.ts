/**
 * Gedeelde groep-logica voor de app, de dev-server (Nitro) en de worker.
 * Elke vriendengroep heeft een slug; alle groepsdata leeft in KV onder
 * uniforme keys: scores:<slug>, sfeer:<slug> en het register 'groepen'.
 */

export const GROEP_LS_KEY = 'ww-groep'
export const GROEP_NAAM_LS_KEY = 'ww-groep-naam'
export const GROEPEN_KEY = 'groepen'

/** queryvlag op /: forceer het groepkeuze-formulier, ook met een bekende groep (/?groepswissel) */
export const GROEPSWISSEL_QUERY = 'groepswissel'

/** zelfde transformatie als slugify in app/composables/useActs.ts */
export function groepSlug(naam: string): string {
  return naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function isGeldigeGroepSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,31}$/.test(slug)
}

export interface GroepInfo {
  naam: string
  t: number
  /** beheergroep ('Badmeester'): verschijnt in het paneel maar is niet te verwijderen */
  admin?: boolean
}

export type GroepenRegister = Record<string, GroepInfo>

/**
 * De beheergroep wordt in KV aangewezen met `admin: true` op haar register-
 * entry (zie GroepInfo.admin) — geen hardcoded slug. Zo verhuist 'beheerder'
 * naar een andere groep zonder deploy; de UI houdt 'Badmeester' als term.
 */
export function isAdminGroep(info?: GroepInfo): boolean {
  return info?.admin === true
}

/** rij in het beheerpaneel: groep + geaggregeerde, niet-persoonlijke stats */
export interface AdminGroep {
  slug: string
  naam: string
  /** aanmaakmoment (uit het register) */
  t: number
  admin: boolean
  /** echte hartjes (status 'scored') */
  likes: number
  /** tips (status 'suggested') */
  suggesties: number
  /** sfeermaker-likes */
  sfeer: number
  /** tent geplaatst op de plattegrond */
  tent: boolean
  /** unieke sessies ≈ groepsgrootte (ruw) */
  sessies: number
  /** laatste activiteit (ms), null als er nog geen stats zijn */
  lastActive: number | null
  /** een sessie gezien binnen ACTIEF_VENSTER_MS */
  actief: boolean
  /** totaal aantal bezoek-pings */
  visits: number
}

/** antwoord van GET /api/admin/groepen */
export interface AdminGroepenResponse {
  groepen: AdminGroep[]
  totaal: { groepen: number, likes: number, actief: number }
}

/** een groep geldt als 'actief' als er een sessie binnen dit venster gezien is */
export const ACTIEF_VENSTER_MS = 7 * 24 * 60 * 60 * 1000

export interface GroepScoreEntry {
  /** 0-3 bij status 'scored', null bij 'suggested' */
  score: number | null
  status: 'scored' | 'suggested'
  t: number
}

export type GroepScoreMap = Record<string, GroepScoreEntry>
export type GroepSfeerMap = Record<string, { t: number }>

/** gedeelde tentlocatie van een groep, als fractie (0..1) van de plattegrond */
export interface GroepTent {
  fx: number
  fy: number
  t: number
}

/**
 * Geaggregeerde, niet-persoonlijke activiteitsstats per groep. `sessies` mapt
 * een willekeurige (pseudonieme) sessie-id naar het laatst-gezien-moment; puur
 * om de groepsgrootte ruw te schatten — nooit gekoppeld over groepen heen.
 */
export interface GroepStats {
  /** laatste activiteit (ms) */
  lastActive: number
  /** totaal aantal bezoek-pings */
  visits: number
  /** sid → laatst gezien (ms) */
  sessies: Record<string, number>
}

export function scoresKey(slug: string): string {
  return `scores:${slug}`
}

export function sfeerKey(slug: string): string {
  return `sfeer:${slug}`
}

export function tentKey(slug: string): string {
  return `tent:${slug}`
}

export function statsKey(slug: string): string {
  return `stats:${slug}`
}

/** vat een stats-blob (of het ontbreken ervan) samen tot de admin-velden */
export function vatStatsSamen(stats: GroepStats | null, now: number = Date.now()) {
  const sessieTijden = stats ? Object.values(stats.sessies) : []
  return {
    sessies: sessieTijden.length,
    lastActive: stats?.lastActive ?? null,
    visits: stats?.visits ?? 0,
    actief: sessieTijden.some(t => now - t < ACTIEF_VENSTER_MS)
  }
}

/** sessie-id: korte pseudonieme token (uuid). Houdt de stats-blob klein. */
export function isGeldigeSid(sid: unknown): sid is string {
  return typeof sid === 'string' && sid.length > 0 && sid.length <= 64
}
