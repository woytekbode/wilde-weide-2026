import { GROEP_LS_KEY, isGeldigeGroepSlug } from '#shared/groep'

const LEGACY_PADEN = ['/tabel', '/ontdekken', '/podia']

/**
 * Routing rond groepen: oude deep links zonder groep doorsturen naar de
 * laatst gebruikte groep. De verse-load-van-/ → schema redirect zit bewust
 * in pages/index.vue (onMounted, ná hydration): tijdens hydration zou een
 * redirect het max-w-xl-formulier-DOM op de groepspagina laten plakken.
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

  // De Sfeer-pagina is opgegaan in Ontdekken (sfeermakers-modus): oude links
  // (zowel /groep/<slug>/sfeer als de bare /sfeer deep link) → /ontdekken.
  // Idem voor de oude /artiesten-naam.
  if (to.path === '/sfeer' || to.path.endsWith('/sfeer')) {
    return navigateTo({ path: to.path.replace(/\/sfeer$/, '/ontdekken'), query: to.query }, { replace: true })
  }
  if (to.path === '/artiesten' || to.path.endsWith('/artiesten')) {
    return navigateTo({ path: to.path.replace(/\/artiesten$/, '/ontdekken'), query: to.query }, { replace: true })
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
})
