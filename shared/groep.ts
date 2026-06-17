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

/** rij in het beheerpaneel: groep + aantal echte hartjes (status 'scored') */
export interface AdminGroep {
  slug: string
  naam: string
  t: number
  admin: boolean
  likes: number
}

/** antwoord van GET /api/admin/groepen */
export interface AdminGroepenResponse {
  groepen: AdminGroep[]
  totaal: { groepen: number, likes: number }
}

export interface GroepScoreEntry {
  /** 0-3 bij status 'scored', null bij 'suggested' */
  score: number | null
  status: 'scored' | 'suggested'
  t: number
}

export type GroepScoreMap = Record<string, GroepScoreEntry>
export type GroepSfeerMap = Record<string, { t: number }>

export function scoresKey(slug: string): string {
  return `scores:${slug}`
}

export function sfeerKey(slug: string): string {
  return `sfeer:${slug}`
}
