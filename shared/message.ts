/**
 * Eén globaal festivalbericht dat de badmeester vanuit het paneel zet en dat
 * clients runtime ophalen — geen rebuild nodig om de inhoud te wijzigen (zelfde
 * KV-aanpak als scores/tent). Eén blob onder de key 'message'; een nieuw bericht
 * vervangt het oude (geen wachtrij).
 *
 * Naamgeving zoals in shared/groep.ts: Engels in de backend/types, Nederlands in
 * de UI. De build/validatie zit hier zodat de dev-server (Nitro) en de worker
 * exact dezelfde regels gebruiken — twee implementaties, één contract.
 */

export const MESSAGE_KEY = 'message'

/** waar het bericht verschijnt; 'all' = elke hoofd-navigatiepagina */
export type MessageTarget = 'all' | 'programma' | 'ontdekken' | 'toppers' | 'podia' | 'kaart'

/**
 * Optionele actieknop. 'share' deelt de eigen groepslink via de OS-deelsheet,
 * 'shareApp' deelt de basis-URL van de app (buiten je eigen groep om) — beide
 * zonder invoer; 'external' opent een URL; 'copy' kopieert een URL/code.
 */
export type MessageAction = 'share' | 'shareApp' | 'external' | 'copy'

export interface BroadcastMessage {
  /** wijzigt alleen bij opnieuw versturen; client vergelijkt met laatst-geziene id */
  id: string
  title: string
  body: string
  /** weglaten = tekst zonder knop */
  action?: MessageAction
  /** URL voor 'external'/'copy' (genegeerd door 'share') */
  link?: string
  /** knoptekst; standaard per actie (zie MESSAGE_ACTION_LABEL) */
  linkLabel?: string
  /** tekstregel die meegaat bij 'share'/'shareApp' (bijv. naar WhatsApp); leeg = MESSAGE_SHARE_TEXT_DEFAULT */
  shareText?: string
  /** 'all' = alle hoofdpagina's, anders één pagina */
  target: MessageTarget
  /** optioneel ms-tijdstip; clients verbergen het bericht daarna */
  expiresAt?: number
  /** laatste-schrijf-tijdstip (ms) */
  t: number
}

/** standaard knoptekst per actie (overschrijfbaar met linkLabel) */
export const MESSAGE_ACTION_LABEL: Record<MessageAction, string> = {
  share: 'Deel',
  shareApp: 'Deel',
  external: 'Open',
  copy: 'Kopieer'
}

/** standaard deel-tekst per share-actie als er geen is ingevuld */
export const MESSAGE_SHARE_TEXT_DEFAULT: Record<'share' | 'shareApp', string> = {
  share: 'Doe mee met onze groep in de Wilde Weide Vriendenplek! 🌿',
  shareApp: 'Maak je eigen groep in de Wilde Weide Vriendenplek! 🌿 Ontdek en deel je favoriete artiesten en zie direct wanneer ze spelen. 🎶'
}

/** route.name per hoofdpagina → target-sleutel (bepaalt 'tonen op deze pagina?') */
export const MESSAGE_PAGE_ROUTE: Record<Exclude<MessageTarget, 'all'>, string> = {
  programma: 'groep-groep',
  ontdekken: 'groep-groep-ontdekken',
  toppers: 'groep-groep-toppers',
  podia: 'groep-groep-podia',
  kaart: 'groep-groep-kaart'
}

const TARGETS: MessageTarget[] = ['all', 'programma', 'ontdekken', 'toppers', 'podia', 'kaart']
const ACTIONS: MessageAction[] = ['share', 'shareApp', 'external', 'copy']

/** verlopen bericht (of geen bericht) → niet tonen/teruggeven */
export function isExpired(m: BroadcastMessage | null | undefined, now: number = Date.now()): boolean {
  return !!m?.expiresAt && now > m.expiresAt
}

/**
 * Valideert en normaliseert de invoer van het paneel tot een BroadcastMessage.
 * `existing` is het huidige bericht: bij stil bijwerken (resend=false) blijft het
 * id staan, bij opnieuw versturen (of als er nog niets is) komt er een nieuw id
 * via `newId()` — zo wordt het bericht opnieuw aan iedereen getoond.
 */
export function buildMessage(
  input: Record<string, unknown>,
  existing: BroadcastMessage | null,
  now: number,
  newId: () => string
): { ok: true, message: BroadcastMessage } | { ok: false, error: string } {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title.length < 1 || title.length > 80) {
    return { ok: false, error: 'titel moet 1 tot 80 tekens zijn' }
  }

  const body = typeof input.body === 'string' ? input.body.trim() : ''
  if (body.length < 1 || body.length > 1000) {
    return { ok: false, error: 'bericht moet 1 tot 1000 tekens zijn' }
  }

  const target = TARGETS.includes(input.target as MessageTarget) ? input.target as MessageTarget : null
  if (!target) {
    return { ok: false, error: 'ongeldige doelpagina' }
  }

  let action: MessageAction | undefined
  if (input.action != null && input.action !== '') {
    if (!ACTIONS.includes(input.action as MessageAction)) {
      return { ok: false, error: 'ongeldige actie' }
    }
    action = input.action as MessageAction
  }

  let link: string | undefined
  if (action === 'external' || action === 'copy') {
    const l = typeof input.link === 'string' ? input.link.trim() : ''
    if (!l || l.length > 500) {
      return { ok: false, error: 'link is verplicht (max 500 tekens)' }
    }
    link = l
  }

  let linkLabel: string | undefined
  if (action) {
    const l = typeof input.linkLabel === 'string' ? input.linkLabel.trim() : ''
    if (l.length > 40) {
      return { ok: false, error: 'knoptekst mag max 40 tekens zijn' }
    }
    if (l) linkLabel = l
  }

  let shareText: string | undefined
  if (action === 'share' || action === 'shareApp') {
    const s = typeof input.shareText === 'string' ? input.shareText.trim() : ''
    if (s.length > 200) {
      return { ok: false, error: 'deel-tekst mag max 200 tekens zijn' }
    }
    if (s) shareText = s
  }

  let expiresAt: number | undefined
  if (input.expiresAt != null && input.expiresAt !== '') {
    const n = Number(input.expiresAt)
    if (!Number.isFinite(n)) {
      return { ok: false, error: 'ongeldige vervaltijd' }
    }
    expiresAt = n
  }

  const resend = input.resend === true
  const id = (resend || !existing) ? newId() : existing.id

  const message: BroadcastMessage = { id, title, body, target, t: now }
  if (action) message.action = action
  if (link) message.link = link
  if (linkLabel) message.linkLabel = linkLabel
  if (shareText) message.shareText = shareText
  if (expiresAt != null) message.expiresAt = expiresAt
  return { ok: true, message }
}
