<script setup lang="ts">
import { DAY_META } from '~/data/display'
import type { DayKey } from '~/types/program'

// tijdens het weekend selecteert app/plugins/now.ts automatisch vandaag
const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')
const { open: legendOpen, openLegend } = useLegend()
const { frozen, toggle: toggleFakeNow } = useFakeNow()
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="day in DAY_META"
        :key="day.key"
        class="ww-nav-btn"
        :class="{ 'ww-nav-btn-active': timetableDay === day.key }"
        @click="timetableDay = day.key"
      >
        <!-- mobiel: korte afkorting (Do/Vr/Za/Zo) zodat de vier dagknoppen op
             één rij passen; vanaf sm de volledige weekdag. Datum staat in de kop -->
        <span class="capitalize sm:hidden">{{ day.shortLabel }}</span>
        <span class="hidden sm:inline">{{ day.label.split(' ')[0] }}</span>
      </button>

      <!-- zelfde stijl als de dagknoppen, maar rechts uitgelijnd (ml-auto);
           springt naar een willekeurig moment in het weekend en bevriest de klok -->
      <button
        type="button"
        class="ww-nav-btn group ml-auto px-3!"
        :class="{ 'ww-nav-btn-active': frozen }"
        :aria-label="frozen ? 'Tijdreizen stoppen' : 'Tijdreizen: spring naar een willekeurig moment in het weekend'"
        :title="frozen ? 'Tijdreizen stoppen' : 'Tijdreizen: spring naar een willekeurig moment in het weekend'"
        @click="toggleFakeNow"
      >
        <!-- Alleen als tijdreizen AAN staat animeert de klok bij hover naar een X
             (klik = stoppen). Staat hij UIT, dan blijft het de klok; de knop zelf
             vult dan alleen via de normale ww-nav-btn hover. Beide iconen liggen
             gestapeld en draaien/faden in elkaar over. -->
        <span class="relative block size-5">
          <UIcon
            name="i-lucide-clock-fading"
            class="absolute inset-0 size-5 transition-all duration-200 ease-out"
            :class="frozen ? 'group-hover:rotate-90 group-hover:scale-50 group-hover:opacity-0' : ''"
          />
          <UIcon
            name="i-lucide-x"
            class="absolute inset-0 size-5 -rotate-90 scale-50 opacity-0 transition-all duration-200 ease-out"
            :class="frozen ? 'group-hover:rotate-0 group-hover:scale-100 group-hover:opacity-100' : ''"
          />
        </span>
      </button>

      <!-- heropent de uitleg-/legenda-modal -->
      <button
        type="button"
        class="ww-nav-btn"
        :class="{ 'ww-nav-btn-active': legendOpen }"
        aria-label="Uitleg"
        title="Snap je er niks van?"
        @click="openLegend"
      >?</button>
    </div>

    <TimetableFilterBar />

    <TimetableGrid :day="timetableDay" />
  </div>
</template>
