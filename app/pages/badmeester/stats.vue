<script setup lang="ts">
import type { AdminGroepenResponse } from '#shared/groep'

definePageMeta({ layout: 'admin' })

const { token, hydrate, adminFetch } = useAdmin()

const totaal = ref({ groepen: 0, likes: 0 })
const bezig = ref(true)
const fout = ref('')

async function laad() {
  bezig.value = true
  fout.value = ''
  try {
    // hergebruikt het groepen-endpoint; toont voorlopig alleen de totalen
    const res = await adminFetch<AdminGroepenResponse>('/api/admin/groepen')
    totaal.value = res.totaal
  } catch (err) {
    if (token.value) fout.value = 'Laden mislukt — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}

onMounted(async () => {
  hydrate()
  if (token.value) await laad()
})
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 pt-4">
    <p v-if="bezig" class="text-sm font-bold">Laden…</p>
    <p v-else-if="fout" class="text-sm font-bold text-red-700">{{ fout }}</p>

    <div v-else class="ww-card flex items-center justify-around gap-4 p-5 text-center">
      <div>
        <div class="font-display text-4xl font-black tabular-nums">{{ totaal.groepen }}</div>
        <div class="text-sm font-bold">groepen</div>
      </div>
      <div>
        <div class="font-display flex items-center justify-center gap-1.5 text-4xl font-black tabular-nums">
          <UIcon name="i-lucide-heart" class="size-7" />{{ totaal.likes }}
        </div>
        <div class="text-sm font-bold">hartjes</div>
      </div>
    </div>
  </div>
</template>
