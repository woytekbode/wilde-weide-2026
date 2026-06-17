<script setup lang="ts">
import { SCORE_OPTIONS, stageColor } from '~/data/display'
import type { DayKey } from '~/types/program'

const { minScore, hiddenStages, toggleStage } = useTimetableFilters()
const { actsForDay } = useActs()
const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')

// Verborgen stages zijn gedeeld over alle dagen, maar je kunt ze hier alleen
// tonen als ze die dag ook spelen. Toon dus enkel de verborgen stages die op de
// gekozen dag voorkomen, anders blijven er chips van een andere dag hangen.
const dayHiddenStages = computed(() => {
  const opDeDag = new Set(actsForDay(timetableDay.value).map(a => a.stage))
  return hiddenStages.value.filter(s => opDeDag.has(s))
})
</script>

<template>
  <div class="ww-card flex flex-wrap items-center gap-2 p-3 text-sm">
    <!-- score-label + chips in één groep zodat "score:" mee naar een nieuwe
         regel zakt i.p.v. los achter te blijven -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="font-bold">hartjes:</span>
      <button
        v-for="opt in SCORE_OPTIONS"
        :key="opt.value"
        class="ww-btn py-0.5! text-sm max-sm:px-2!"
        :class="{ 'ww-btn-active': minScore === opt.value }"
        :title="opt.title"
        @click="minScore = opt.value"
      >{{ opt.label }}</button>
    </div>

    <!-- toon-stage-label + chips in één groep zodat het label mee naar een
         nieuwe regel zakt; sm:ml-3 alleen als het op dezelfde regel als de
         score-groep staat, bij wrappen op telefoon geen inspring zodat het
         uitlijnt met 'score:' -->
    <div v-if="dayHiddenStages.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="font-bold sm:ml-3">stage:</span>
      <button
        v-for="stage in dayHiddenStages"
        :key="stage"
        class="cursor-pointer rounded-full border-[3px] border-black px-3 py-1 text-xs font-bold"
        :class="stageColor(stage)"
        :style="{ viewTransitionName: `stage-${slugify(stage)}`, viewTransitionClass: 'ww-chip' }"
        title="toon stage"
        @click="toggleStage(stage)"
      >{{ stage }}</button>
    </div>
  </div>
</template>
