<script setup lang="ts">
import { GROEPSWISSEL_QUERY } from '#shared/groep'

const route = useRoute()
const { token, hydrate, setToken } = useAdmin()

// 'Badmeester' in de subtitel linkt naar het groepkeuze-formulier, net als de
// groepsnaam in de standaard-layout
const kiesGroepLink = `/?${GROEPSWISSEL_QUERY}`

// sessionStorage bestaat niet tijdens prerender: pas na mount lezen, zodat de
// voorgerenderde shell altijd het slot toont
onMounted(hydrate)

const wachtwoord = ref('')
function ontgrendel() {
  const t = wachtwoord.value.trim()
  if (!t) return
  setToken(t)
  wachtwoord.value = ''
}

const nav = [
  { to: '/badmeester', label: 'Groepen', icon: 'i-lucide-users' },
  { to: '/badmeester/stats', label: 'Stats', icon: 'i-lucide-bar-chart-3' }
]

// vaste paginakleur (lila); geef de gutter dezelfde kleur als de pagina
const ACCENT = 'var(--color-lila-500)'
useHead({
  htmlAttrs: { style: `--ww-page-bg: ${ACCENT}` }
})
</script>

<template>
  <div
    class="min-h-screen bg-lila-500 pb-24 lg:pb-10"
    :style="{ '--ww-accent': ACCENT }"
  >
    <header class="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 pt-5 pb-4 lg:px-8">
      <div>
        <NuxtLink to="/badmeester" class="block">
          <h1 class="font-display text-4xl font-black leading-none tracking-tight lg:text-5xl">
            Wilde Weide 2026
          </h1>
        </NuxtLink>
        <div class="mt-1 text-sm font-bold">
          <NuxtLink
            :to="kiesGroepLink"
            class="underline decoration-2 underline-offset-2"
          >Badmeester</NuxtLink> ·
          3.4.5 juli 2026 · Netl de Wildste Tuin<span class="hidden sm:inline">, Kraggenburg</span>
        </div>
      </div>

      <nav v-if="token" class="hidden gap-2 lg:flex">
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
      <div v-if="!token" class="mx-auto max-w-xl pt-4">
        <form class="ww-card space-y-4 p-5" @submit.prevent="ontgrendel">
          <h2 class="font-display text-3xl font-black leading-tight">Badmeester worden?</h2>
          <input
            v-model="wachtwoord"
            type="password"
            placeholder="Wachtwoord"
            autocomplete="current-password"
            class="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-bold placeholder:font-normal"
          >
          <button type="submit" class="ww-btn-solid relative w-full">
            Plons
            <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-arrow-right" class="size-4" />
            </span>
          </button>
        </form>
      </div>
      <slot v-else />
    </main>

    <!-- mobiele onderbalk -->
    <nav v-if="token" class="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t-[3px] border-black bg-white py-1.5 lg:hidden">
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
  </div>
</template>
