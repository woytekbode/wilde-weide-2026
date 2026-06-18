/**
 * Groeps-API naast de statische site: elke vriendengroep heeft haar eigen
 * hartjes-scores en sfeermaker-likes in Workers KV, als blobs per groep:
 *   groepen        → { [slug]: { naam, t } }            (register)
 *   scores:<slug>  → { [actId]: { score, status, t } }
 *   sfeer:<slug>   → { [id]: { t } }                    (aanwezig = like)
 *   tent:<slug>    → { fx, fy, t }                      (gedeelde tentlocatie)
 *
 * Read-modify-write op één blob is last-write-wins; bij gelijktijdige kliks
 * van twee telefoons kan er in theorie één verloren gaan — voor een
 * vriendengroep acceptabel.
 */

import type { AdminGroep, GroepenRegister, GroepScoreMap, GroepSfeerMap, GroepStats, GroepTent } from '../shared/groep'
import { GROEPEN_KEY, groepSlug, isAdminGroep, isGeldigeGroepSlug, isGeldigeSid, scoresKey, sfeerKey, statsKey, tentKey, summarizeStats } from '../shared/groep'

interface Env {
  SCORES: {
    get<T>(key: string, type: 'json'): Promise<T | null>
    put(key: string, value: string): Promise<void>
    delete(key: string): Promise<void>
  }
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  /** beheertoken; ontbreekt → admin-API zit op slot (fail closed) */
  ADMIN_TOKEN?: string
}

/** aantal entries met een bepaalde status ('scored' = hartjes, 'suggested' = tips) */
function telStatus(scores: GroepScoreMap | null, status: 'scored' | 'suggested'): number {
  if (!scores) return 0
  let n = 0
  for (const id in scores) {
    if (scores[id]!.status === status) n++
  }
  return n
}

/** null = toegestaan; anders een 401-Response. Fail closed zonder token. */
function vereisAdmin(request: Request, env: Env): Response | null {
  if (!env.ADMIN_TOKEN || request.headers.get('x-admin-token') !== env.ADMIN_TOKEN) {
    return json({ error: 'unauthorized' }, 401)
  }
  return null
}

const MAX_GROEPEN = 250

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  })
}

async function leesBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return typeof body === 'object' && body !== null ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Beheerpaneel: alle routes onder /api/admin/ zijn token-gated en botsen
    // niet met de /api/groep-regex hieronder.
    if (url.pathname === '/api/admin/groepen') {
      if (request.method !== 'GET') {
        return json({ error: 'method not allowed' }, 405)
      }
      const onbevoegd = vereisAdmin(request, env)
      if (onbevoegd) return onbevoegd

      const groepen = await env.SCORES.get<GroepenRegister>(GROEPEN_KEY, 'json') ?? {}
      const rijen: AdminGroep[] = []
      let likesTotaal = 0
      let actiefTotaal = 0
      for (const slug in groepen) {
        const info = groepen[slug]!
        const [scores, sfeer, tent, stats] = await Promise.all([
          env.SCORES.get<GroepScoreMap>(scoresKey(slug), 'json'),
          env.SCORES.get<GroepSfeerMap>(sfeerKey(slug), 'json'),
          env.SCORES.get<GroepTent>(tentKey(slug), 'json'),
          env.SCORES.get<GroepStats>(statsKey(slug), 'json')
        ])
        const likes = telStatus(scores, 'scored')
        const samenvatting = summarizeStats(stats)
        likesTotaal += likes
        if (samenvatting.active) actiefTotaal++
        rijen.push({
          slug,
          naam: info.naam,
          t: info.t,
          admin: isAdminGroep(info),
          likes,
          suggestions: telStatus(scores, 'suggested'),
          sfeer: sfeer ? Object.keys(sfeer).length : 0,
          tent: tent !== null,
          ...samenvatting
        })
      }
      rijen.sort((a, b) => b.t - a.t)
      return json({ groepen: rijen, totaal: { groepen: rijen.length, likes: likesTotaal, active: actiefTotaal } })
    }

    const adminDel = url.pathname.match(/^\/api\/admin\/groep\/([^/]+)$/)
    if (adminDel) {
      if (request.method !== 'DELETE') {
        return json({ error: 'method not allowed' }, 405)
      }
      const onbevoegd = vereisAdmin(request, env)
      if (onbevoegd) return onbevoegd

      const slug = adminDel[1]!
      if (!isGeldigeGroepSlug(slug)) {
        return json({ error: 'groep bestaat niet' }, 404)
      }
      const groepen = await env.SCORES.get<GroepenRegister>(GROEPEN_KEY, 'json') ?? {}
      const info = groepen[slug]
      if (!info) {
        return json({ error: 'groep bestaat niet' }, 404)
      }
      if (isAdminGroep(info)) {
        return json({ error: 'beheergroep kan niet verwijderd worden' }, 400)
      }
      await env.SCORES.delete(scoresKey(slug))
      await env.SCORES.delete(sfeerKey(slug))
      await env.SCORES.delete(tentKey(slug))
      await env.SCORES.delete(statsKey(slug))
      delete groepen[slug]
      await env.SCORES.put(GROEPEN_KEY, JSON.stringify(groepen))
      return json({ ok: true })
    }

    // join-or-create: bestaat de naam al, dan sluit je je daarbij aan
    if (url.pathname === '/api/groep') {
      if (request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405)
      }
      const body = await leesBody(request)
      if (!body) {
        return json({ error: 'ongeldige JSON' }, 400)
      }
      const naam = typeof body.naam === 'string' ? body.naam.trim() : ''
      if (naam.length < 2 || naam.length > 40) {
        return json({ error: 'naam moet 2 tot 40 tekens zijn' }, 400)
      }
      const slug = groepSlug(naam)
      if (!isGeldigeGroepSlug(slug)) {
        return json({ error: 'naam moet minstens 2 letters of cijfers bevatten' }, 400)
      }

      const groepen = await env.SCORES.get<GroepenRegister>(GROEPEN_KEY, 'json') ?? {}
      const bestaand = groepen[slug]
      if (bestaand) {
        return json({ slug, naam: bestaand.naam, bestond: true })
      }
      if (Object.keys(groepen).length >= MAX_GROEPEN) {
        return json({ error: 'maximum aantal groepen bereikt' }, 409)
      }
      groepen[slug] = { naam, t: Date.now() }
      await env.SCORES.put(GROEPEN_KEY, JSON.stringify(groepen))
      return json({ slug, naam, bestond: false })
    }

    const groepMatch = url.pathname.match(/^\/api\/groep\/([^/]+)(?:\/(scores|sfeer|tent|visit))?$/)
    if (groepMatch) {
      const slug = groepMatch[1]!
      const sub = groepMatch[2]
      if (!isGeldigeGroepSlug(slug)) {
        return json({ error: 'groep bestaat niet' }, 404)
      }
      const groepen = await env.SCORES.get<GroepenRegister>(GROEPEN_KEY, 'json') ?? {}
      const groep = groepen[slug]
      if (!groep) {
        return json({ error: 'groep bestaat niet' }, 404)
      }

      if (!sub) {
        if (request.method !== 'GET') {
          return json({ error: 'method not allowed' }, 405)
        }
        return json({ slug, naam: groep.naam })
      }

      const key = sub === 'scores'
        ? scoresKey(slug)
        : sub === 'sfeer' ? sfeerKey(slug) : sub === 'tent' ? tentKey(slug) : statsKey(slug)

      // stats (visit) is alleen-schrijven: de pseudonieme sessie-map nooit
      // publiek teruggeven; alleen het beheerpaneel ziet de samenvatting.
      if (request.method === 'GET') {
        if (sub === 'visit') {
          return json({ error: 'method not allowed' }, 405)
        }
        // tent is één blob (of nog niet gezet → null); scores/sfeer zijn maps
        return json(await env.SCORES.get(key, 'json') ?? (sub === 'tent' ? null : {}))
      }
      if (request.method !== 'POST') {
        return json({ error: 'method not allowed' }, 405)
      }

      const body = await leesBody(request)
      if (!body) {
        return json({ error: 'ongeldige JSON' }, 400)
      }

      // visit: activiteits-ping (geen id, wel een pseudonieme sid). Werkt de
      // stats-blob bij: lastActive, een teller en de sessie-map (≈ grootte).
      if (sub === 'visit') {
        const { sid } = body
        if (!isGeldigeSid(sid)) {
          return json({ error: 'sid ontbreekt' }, 400)
        }
        const now = Date.now()
        const stats = await env.SCORES.get<GroepStats>(key, 'json') ?? { lastActive: now, visits: 0, sessions: {} }
        stats.sessions ??= {} // oudere blobs misten dit veld
        stats.sessions[sid] = now
        stats.lastActive = now
        stats.visits = (stats.visits ?? 0) + 1
        await env.SCORES.put(key, JSON.stringify(stats))
        return json({ ok: true })
      }

      // tent: één gedeelde coördinaat (geen id). clear:true haalt 'm weg.
      if (sub === 'tent') {
        if (body.clear === true) {
          await env.SCORES.delete(key)
          return json(null)
        }
        const { fx, fy } = body
        if (typeof fx !== 'number' || typeof fy !== 'number' || fx < 0 || fx > 1 || fy < 0 || fy > 1) {
          return json({ error: 'fx en fy moeten tussen 0 en 1 liggen' }, 400)
        }
        const tent = { fx, fy, t: Date.now() }
        await env.SCORES.put(key, JSON.stringify(tent))
        return json(tent)
      }

      const { id } = body
      if (typeof id !== 'string' || !id) {
        return json({ error: 'id ontbreekt' }, 400)
      }

      if (sub === 'scores') {
        const { score, suggested } = body
        const scores = await env.SCORES.get<GroepScoreMap>(key, 'json') ?? {}
        if (typeof suggested === 'boolean') {
          if (suggested) {
            scores[id] = { score: null, status: 'suggested', t: Date.now() }
          } else {
            delete scores[id]
          }
        } else {
          // null verwijdert de score; 0 = beoordeeld, niet voor ons
          if (score !== null && score !== 0 && score !== 1 && score !== 2 && score !== 3) {
            return json({ error: 'score moet 0, 1, 2, 3 of null zijn' }, 400)
          }
          if (score === null) {
            delete scores[id]
          } else {
            scores[id] = { score, status: 'scored', t: Date.now() }
          }
        }
        await env.SCORES.put(key, JSON.stringify(scores))
        return json(scores)
      }

      const { liked } = body
      if (typeof liked !== 'boolean') {
        return json({ error: 'liked moet true of false zijn' }, 400)
      }
      const likes = await env.SCORES.get<GroepSfeerMap>(key, 'json') ?? {}
      if (liked) {
        likes[id] = { t: Date.now() }
      } else {
        delete likes[id]
      }
      await env.SCORES.put(key, JSON.stringify(likes))
      return json(likes)
    }

    // de groepsroutes zijn niet voorgerenderd: serveer de SPA-shell
    if (url.pathname.startsWith('/groep/')) {
      return env.ASSETS.fetch(new Request(new URL('/200.html', url), request))
    }

    return env.ASSETS.fetch(request)
  }
}
