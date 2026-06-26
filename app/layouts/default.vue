<script setup lang="ts">
import { GROEPSWISSEL_QUERY } from '#shared/groep'
import { DAY_META } from '~/data/display'
import type { DayKey } from '~/types/program'

const route = useRoute()
const { groep, groepNaam } = useGroep()
const kiesGroepLink = `/?${GROEPSWISSEL_QUERY}`

const nav = computed(() => {
  const base = `/groep/${groep.value}`
  return [
    { to: base, label: 'Programma', icon: 'i-lucide-layout-template' },
    // Tabel-pagina blijft bestaan (/tabel werkt nog), maar staat bewust niet in de nav
    // { to: `${base}/tabel`, label: 'Tabel', icon: 'i-lucide-table' },
    { to: `${base}/ontdekken`, label: 'Ontdekken', icon: 'i-lucide-binoculars' },
    { to: `${base}/toppers`, label: 'Toppers', icon: 'i-lucide-podium' },
    { to: `${base}/podia`, label: 'Podia', icon: 'i-lucide-bubbles' },
    { to: `${base}/kaart`, label: 'Kaart', icon: 'i-lucide-map' }
  ]
})

// Volle paginakleur zoals wildeweide.nl: vaste kleur per route,
// op het blokkenschema volgt hij de gekozen festivaldag.
const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')

const BG_CLASSES: Record<string, string> = {
  lila: 'bg-lila-500',
  oker: 'bg-oker-500',
  veld: 'bg-veld-500'
}
const ACCENT_VARS: Record<string, string> = {
  lila: 'var(--color-lila-500)',
  oker: 'var(--color-oker-500)',
  veld: 'var(--color-veld-500)'
}

const pageColor = computed<string>(() => {
  if (route.name === 'groep-groep') {
    const meta = DAY_META.find(d => d.key === timetableDay.value)
    if (meta?.key === 'zaterdag') return 'oker'
    // donderdag (camping) deelt nu de groene veld-kleur met zondag
    if (meta?.key === 'zondag' || meta?.key === 'donderdag') return 'veld'
    return 'lila'
  }
  return (route.meta.wwBg as string) ?? 'lila'
})

// Geef de paginakleur ook aan <html> door: --ww-page-bg zodat de scrollbar-gutter
// (in main.css) dezelfde achtergrondkleur krijgt, én --ww-accent zodat overlays die
// uit de layout-div worden geteleporteerd (de slideover, in <body>) de paginakleur
// erven i.p.v. terug te vallen op lila.
useHead({
  htmlAttrs: {
    style: computed(() => `--ww-page-bg: ${ACCENT_VARS[pageColor.value]}; --ww-accent: ${ACCENT_VARS[pageColor.value]}`)
  }
})
</script>

<template>
  <div
    class="min-h-screen pb-24 transition-colors duration-500 lg:pb-10"
    :class="BG_CLASSES[pageColor]"
    :style="{ '--ww-accent': ACCENT_VARS[pageColor] }"
  >
    <header class="mx-auto max-w-7xl px-4 pt-5 pb-4 lg:px-8">
      <!-- titelrij + nav delen één regel en lijnen onderaan uit; de pilhoogte
           valt samen met de teksthoogte, dus de bovenkanten lopen ook gelijk -->
      <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 lg:flex-nowrap">
        <div class="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 lg:flex-col lg:items-start lg:gap-1 xl:flex-row xl:items-baseline xl:gap-3">
          <NuxtLink :to="groep ? `/groep/${groep}` : '/'" >
            <h1 class="font-display text-4xl font-black leading-none tracking-tight lg:text-5xl">
              Wilde Weide
            </h1>
          </NuxtLink>
          <h2 class="font-display text-2xl font-black leading-none lg:text-3xl"><span class="align-bottom text-base lg:text-lg">🌿</span> Vriendenplek <span class="align-bottom text-base lg:text-lg">🌿</span></h2>
        </div>

        <nav v-if="groep" class="hidden shrink-0 gap-2 lg:mt-1.5 lg:flex">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            class="ww-nav-btn"
            :class="{ 'ww-nav-btn-active': route.path === item.to }"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </div>

      <div class="mt-1 text-sm font-bold">
        <!-- groepsnaam + scheidingsstip alleen tonen als er een groep gekozen
             is; op de groepsnaam-invoerpagina begint de subtitel meteen bij de
             datum -->
        <template v-if="groep">
          <NuxtLink
            :to="kiesGroepLink"
            class="underline decoration-2 underline-offset-2"
          >{{ groepNaam || groep }}</NuxtLink> ·
        </template>
        3.4.5 juli 2026 · Netl de Wildste Tuin<span class="hidden sm:inline">, Kraggenburg</span>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 lg:px-8">
      <slot />
    </main>

    <!-- mobiele onderbalk -->
    <nav v-if="groep" class="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t-[3px] border-black bg-white py-1.5 lg:hidden">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-2xs font-bold transition-transform motion-safe:active:scale-95"
        :style="route.path === item.to ? { backgroundColor: '#000', color: 'var(--ww-accent)' } : undefined"
      >
        <UIcon :name="item.icon" class="size-5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <ActDetailsSlideover />
    <LegendModal />
  </div>
</template>
