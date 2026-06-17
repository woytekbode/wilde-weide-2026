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
    { to: base, label: 'Blokken', icon: 'i-lucide-layout-template' },
    // Tabel-pagina blijft bestaan (/tabel werkt nog), maar staat bewust niet in de nav
    // { to: `${base}/tabel`, label: 'Tabel', icon: 'i-lucide-table' },
    { to: `${base}/acts`, label: 'Acts', icon: 'i-lucide-layout-grid' },
    { to: `${base}/sfeer`, label: 'Sfeer', icon: 'i-lucide-bubbles' },
    { to: `${base}/stages`, label: 'Stages', icon: 'i-lucide-ship' }
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

// Geef de paginakleur ook aan <html> door, zodat de scrollbar-gutter
// (in main.css) dezelfde achtergrondkleur krijgt als de pagina.
useHead({
  htmlAttrs: {
    style: computed(() => `--ww-page-bg: ${ACCENT_VARS[pageColor.value]}`)
  }
})
</script>

<template>
  <div
    class="min-h-screen pb-24 transition-colors duration-300 lg:pb-10"
    :class="BG_CLASSES[pageColor]"
    :style="{ '--ww-accent': ACCENT_VARS[pageColor] }"
  >
    <header class="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-5 pb-4 lg:px-8">
      <div>
        <NuxtLink :to="groep ? `/groep/${groep}` : '/'" class="block">
          <h1 class="font-display text-4xl font-black leading-none tracking-tight lg:text-5xl">
            Wilde Weide 2026
          </h1>
        </NuxtLink>
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
      </div>

      <nav v-if="groep" class="hidden gap-2 lg:flex">
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
        class="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 text-[11px] font-bold"
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
