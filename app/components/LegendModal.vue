<script setup lang="ts">
import { stageColor } from '~/data/display'

const { open, legendPending, openLegend, closeLegend } = useLegend()
const { groep } = useGroep()

// Eénmalig automatisch tonen zodra er een groep actief is. Geen immediate-watch:
// die draait synchroon binnen watch() en zou stop() aanroepen vóór stop is
// geïnitialiseerd (TDZ — crasht bij een directe /groep/<slug>-link). Dus het
// 'al actief'-geval apart afhandelen, en pas daarna een gewone watch opzetten
// voor het kiezen van een groep vanaf /.
onMounted(() => {
  if (!legendPending()) return
  if (groep.value) {
    openLegend()
    return
  }
  const stop = watch(groep, (slug) => {
    if (slug) {
      openLegend()
      stop()
    }
  })
})

// Zelfde scroll-lock als de act-slideover: vergrendel <html> zolang open, zodat
// scrollbar-gutter de breedte vasthoudt (geen sprong, geen losse gutter).
if (import.meta.client) {
  watch(open, (isOpen) => {
    document.documentElement.classList.toggle('modal-open', isOpen)
  })
  onScopeDispose(() => document.documentElement.classList.remove('modal-open'))
}
</script>

<template>
  <USlideover v-model:open="open" side="bottom">
    <template #content>
      <div class="max-h-[85vh] overflow-y-auto border-t-[3px] border-black bg-white p-5 pb-10">
        <div class="mx-auto max-w-2xl space-y-4">
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-display text-3xl font-black leading-tight">Snap je er niks van?</h2>
            <button class="ww-btn-solid shrink-0 px-3!" aria-label="Sluiten" @click="closeLegend">✕</button>
          </div>

          <div class="divide-y-2 divide-black/10">
            <!-- stage verbergen -->
            <div class="flex items-center gap-4 py-3">
              <div class="flex w-24 shrink-0 justify-center">
                <span
                  class="rounded-full border-[3px] border-black px-3 py-1 text-xs font-bold"
                  :class="stageColor('Kas')"
                >Kas</span>
              </div>
              <p class="text-sm">
                <span class="font-bold">Verberg stage</span> een simpele tik is genoeg.
              </p>
            </div>

            <!-- reputatie -->
            <div class="flex items-center gap-4 py-3">
              <div class="flex w-24 shrink-0 justify-center">
                <span class="text-xl font-bold leading-none">✦✦✦</span>
              </div>
              <p class="text-sm">
                <span class="font-bold">Reputatie</span> wat Claude zegt, zegt natuurlijk niks over jullie voorkeur!
              </p>
            </div>

            <!-- hartjes -->
            <div class="flex items-center gap-4 py-3">
              <div class="flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 leading-none">
                <span class="text-xl text-red-600">♥♥♥</span>
              </div>
              <p class="text-sm">
                <span class="font-bold">Hartjes</span> deze MOET je zien (als je niet verdwaald bent of honger hebt).
              </p>
            </div>

            <!-- tip -->
            <div class="flex items-center gap-4 py-3">
              <div class="flex w-24 shrink-0 justify-center">
                <span class="flex size-6 items-center justify-center rounded-full border-2 border-black bg-yellow-300 text-xs font-black">?</span>
              </div>
              <p class="text-sm">
                <span class="font-bold">Tip</span> kan je zelf geen keuze maken? Laat iemand anders het doen!
              </p>
            </div>

            <!-- conflict -->
            <div class="flex items-center gap-4 py-3">
              <div class="flex w-24 shrink-0 justify-center">
                <span class="flex size-6 items-center justify-center rounded-full border-2 border-black bg-red-400 text-xs font-black">!</span>
              </div>
              <p class="text-sm">
                <span class="font-bold">Conflict</span> aii, jouw favorieten hebben hetzelfde timeslot.
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
