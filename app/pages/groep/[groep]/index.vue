<script setup lang="ts">
import { DAY_META } from '~/data/display'
import type { DayKey } from '~/types/program'

// tijdens het weekend selecteert app/plugins/now.ts automatisch vandaag
const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')
const { openLegend } = useLegend()
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
           heropent de uitleg-/legenda-modal -->
      <button
        type="button"
        class="ww-nav-btn ml-auto"
        aria-label="Uitleg"
        title="Uitleg"
        @click="openLegend"
      >?</button>
    </div>

    <TimetableFilterBar />

    <TimetableGrid :day="timetableDay" />
  </div>
</template>
