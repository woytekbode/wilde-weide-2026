<script setup lang="ts">
import type { AdminGroep, AdminGroepenResponse } from '#shared/groep'

definePageMeta({ layout: 'admin' })

const { token, hydrate, adminFetch } = useAdmin()
const toast = useToast()

const groepen = ref<AdminGroep[]>([])
const totaal = ref({ groepen: 0, likes: 0 })
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

async function verwijder(groep: AdminGroep) {
  if (!confirm(`'${groep.naam}' definitief verwijderen? Scores en sfeer-likes gaan verloren.`)) {
    return
  }
  try {
    await adminFetch(`/api/admin/groep/${groep.slug}`, { method: 'DELETE' })
    groepen.value = groepen.value.filter(g => g.slug !== groep.slug)
    totaal.value = { groepen: totaal.value.groepen - 1, likes: totaal.value.likes - groep.likes }
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
        class="flex items-center gap-3 px-4 py-3"
      >
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate font-bold">{{ groep.naam }}</span>
            <span
              v-if="groep.admin"
              class="shrink-0 rounded-full border-2 border-black px-2 text-[11px] font-bold"
            >beheer</span>
          </div>
          <div class="truncate text-xs font-bold text-black/50">{{ groep.slug }}</div>
        </div>
        <span class="flex shrink-0 items-center gap-1 font-bold tabular-nums">
          <UIcon name="i-lucide-heart" class="size-4" />{{ groep.likes }}
        </span>
        <button
          v-if="!groep.admin"
          class="shrink-0 rounded-full border-2 border-black p-1.5 transition hover:bg-black hover:text-white motion-safe:active:scale-95"
          :aria-label="`${groep.naam} verwijderen`"
          @click="verwijder(groep)"
        >
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
