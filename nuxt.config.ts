export default defineNuxtConfig({
  compatibilityDate: '2026-06-11',
  modules: ['@nuxt/ui', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  // expliciet statisch, anders schakelt Nitro op Cloudflare CI naar de Workers-preset.
  // /badmeester* is nergens gelinkt, dus expliciet prerenderen zodat de worker ze serveert.
  nitro: { preset: 'static', prerender: { routes: ['/badmeester', '/badmeester/stats'] } },
  ui: {
    colorMode: false
  },
  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
      title: 'Wilde Weide 2026 — met wie ga jij?',
      meta: [
        { name: 'description', content: 'Ons eigen blokkenschema voor Wilde Weide Festival, 3-5 juli 2026' },
        { name: 'theme-color', content: '#a48dbe' }
      ],
      link: [
        {
          rel: 'icon',
          href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🐼</text></svg>"
        }
      ]
    }
  }
})
