<script setup lang="ts">
import stagesData from '~/data/wildeweide-stages.json'
import { DAY_META } from '~/data/display'

definePageMeta({ wwBg: 'oker' })

const days = stagesData.days.map(d => ({
  ...d,
  meta: DAY_META.find(m => m.date === d.date),
  stages: Object.entries(d.stages)
}))
</script>

<template>
  <div class="space-y-6">
    <!-- intro -->
    <section class="ww-card p-4">
      <p class="text-sm font-bold">{{ stagesData.doel }}</p>
    </section>

    <!-- sfeer per stage per dag -->
    <section v-for="day in days" :key="day.date" class="ww-card overflow-hidden">
      <div class="border-b-[3px] border-black px-4 py-2 font-display text-lg font-black" :class="day.meta?.accentSoft">
        {{ day.day }}
      </div>
      <div class="divide-y-2 divide-black/10">
        <div
          v-for="[stage, sfeer] in day.stages"
          :key="stage"
          class="flex items-start gap-3 px-4 py-2.5"
        >
          <StageBadge :stage="stage" class="w-28 shrink-0 justify-center" />
          <p class="text-sm">{{ sfeer }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
