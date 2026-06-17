import { GROEP_LS_KEY, GROEPSWISSEL_QUERY, isGeldigeGroepSlug } from '#shared/groep'

const LEGACY_PADEN = ['/tabel', '/artiesten', '/sfeer', '/podia']

/**
 * Routing rond groepen: oude deep links zonder groep doorsturen naar de
 * laatst gebruikte groep, en op een verse load van / direct het schema in.
 * Het onthouden/vergeten van de groep zelf doet plugins/groep.client.ts,
 * pas nadat de groep echt blijkt te bestaan.
 */
export default defineNuxtRouteMiddleware((to) => {
  // tijdens prerender niets doen: geen browser-APIs, geen redirects
  if (import.meta.server) return

  // trailing slash weghalen zodat de nav-active checks op padgelijkheid werken
  if (to.path !== '/' && to.path.endsWith('/')) {
    return navigateTo({ path: to.path.replace(/\/+$/, ''), query: to.query }, { replace: true })
  }

  const slug = typeof to.params.groep === 'string' ? to.params.groep : undefined
  if (slug !== undefined) {
    if (!isGeldigeGroepSlug(slug)) return navigateTo('/', { replace: true })
    return
  }

  const laatste = localStorage.getItem(GROEP_LS_KEY)

  // oude deep links zonder groep → naar de laatst gebruikte groep
  if (LEGACY_PADEN.includes(to.path)) {
    return navigateTo(laatste ? `/groep/${laatste}${to.path}` : '/', { replace: true })
  }

  // verse load op / met een bekende groep → direct het schema in;
  // in-app naar / navigeren (groep wisselen) of ?groepswissel toont het formulier
  if (to.path === '/' && laatste && to.query[GROEPSWISSEL_QUERY] === undefined && useNuxtApp().isHydrating) {
    return navigateTo(`/groep/${laatste}`, { replace: true })
  }
})
