<script setup lang="ts">
import type { AdminGroep, AdminGroepenResponse } from '#shared/groep'

definePageMeta({ layout: 'admin' })

const { token, hydrate, adminFetch } = useAdmin()
const toast = useToast()

const groepen = ref<AdminGroep[]>([])
const totaal = ref({ groepen: 0, likes: 0, active: 0 })
const bezig = ref(true)
const fout = ref('')

async function laad() {
  bezig.value = true
  fout.value = ''
  try {
    const res = await adminFetch<AdminGroepenResponse>('/api/admin/groepen')
    groepen.value = res.groepen
    totaal.value = res.totaal
  } catch (err) {
    // 401 wist het token (in adminFetch); de layout valt dan terug op het formulier
    if (token.value) fout.value = 'Laden mislukt — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}

onMounted(async () => {
  hydrate()
  if (token.value) await laad()
})

const datumFmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
function datum(ms: number): string {
  return datumFmt.format(ms)
}

/** korte 'x geleden' (nu/5m/3u/2d/4w), of een datum voor oudere activiteit */
function geleden(ms: number | null): string {
  if (!ms) return 'nooit'
  const sec = (Date.now() - ms) / 1000
  if (sec < 60) return 'nu'
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}u`
  if (sec < 86400 * 28) return `${Math.floor(sec / 86400)}d`
  return datum(ms)
}

async function verwijder(groep: AdminGroep) {
  if (!confirm(`'${groep.naam}' definitief verwijderen? Scores en sfeer-likes gaan verloren.`)) {
    return
  }
  try {
    await adminFetch(`/api/admin/groep/${groep.slug}`, { method: 'DELETE' })
    groepen.value = groepen.value.filter(g => g.slug !== groep.slug)
    totaal.value = {
      groepen: totaal.value.groepen - 1,
      likes: totaal.value.likes - groep.likes,
      active: totaal.value.active - (groep.active ? 1 : 0)
    }
    toast.add({ title: `${groep.naam} verwijderd` })
  } catch (err) {
    const data = (err as { data?: { error?: string, statusMessage?: string } }).data
    toast.add({ title: data?.error ?? data?.statusMessage ?? 'Verwijderen mislukt', color: 'error' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 pt-4">
    <p v-if="bezig" class="text-sm font-bold">Laden…</p>
    <p v-else-if="fout" class="text-sm font-bold text-red-700">{{ fout }}</p>

    <div v-else class="ww-card divide-y-2 divide-black/10">
      <div
        v-for="groep in groepen"
        :key="groep.slug"
        class="flex items-start gap-3 px-4 py-3"
      >
        <!-- actief-stip: groen als er een sessie binnen 7 dagen gezien is -->
        <span
          class="mt-1.5 size-2.5 shrink-0 rounded-full border border-black"
          :class="groep.active ? 'bg-veld-500' : 'bg-transparent'"
          :title="groep.active ? 'actief (laatste 7 dagen)' : 'inactief'"
        />

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-bold">{{ groep.naam }}</span>
            <span
              v-if="groep.admin"
              class="shrink-0 rounded-full border-2 border-black px-2 text-[11px] font-bold"
            >beheer</span>
          </div>
          <div class="truncate text-xs font-bold text-black/50">{{ groep.slug }}</div>

          <!-- geaggregeerde, niet-persoonlijke stats -->
          <div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold tabular-nums text-black/70">
            <span class="flex items-center gap-1" title="aangemaakt">
              <UIcon name="i-lucide-calendar" class="size-3.5" />{{ datum(groep.t) }}
            </span>
            <span class="flex items-center gap-1" title="laatste activiteit">
              <UIcon name="i-lucide-clock" class="size-3.5" />{{ geleden(groep.lastActive) }}
            </span>
            <span class="flex items-center gap-1" title="unieke sessies (≈ grootte)">
              <UIcon name="i-lucide-users" class="size-3.5" />{{ groep.sessions }}
            </span>
            <span class="flex items-center gap-1" title="hartjes">
              <UIcon name="i-lucide-heart" class="size-3.5" />{{ groep.likes }}
            </span>
            <span v-if="groep.suggestions" class="flex items-center gap-1" title="tips">
              <UIcon name="i-lucide-lightbulb" class="size-3.5" />{{ groep.suggestions }}
            </span>
            <span v-if="groep.sfeer" class="flex items-center gap-1" title="sfeer-likes">
              <UIcon name="i-lucide-bubbles" class="size-3.5" />{{ groep.sfeer }}
            </span>
            <UIcon v-if="groep.tent" name="i-lucide-tent" class="size-3.5" title="tent geplaatst" />
          </div>
        </div>

        <button
          v-if="!groep.admin"
          class="mt-0.5 shrink-0 rounded-full border-2 border-black p-1.5 transition hover:bg-black hover:text-white motion-safe:active:scale-95"
          :aria-label="`${groep.naam} verwijderen`"
          @click="verwijder(groep)"
        >
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
