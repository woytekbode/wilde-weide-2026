<script setup lang="ts">
import { SCORE_OPTIONS, stageColor } from '~/data/display'
import type { DayKey, Programme } from '~/types/program'

const props = withDefaults(defineProps<{ programme?: Programme }>(), { programme: 'muziek' })

const { minScore, hiddenStages, toggleStage } = useTimetableFilters(props.programme)
const { actsForDay } = useProgramme(props.programme)
const timetableDay = useState<DayKey>('timetable-day', () => 'vrijdag')

// programmawissel (muziek of sfeermakers); gedeelde state met de pagina
const programme = useState<Programme>('programme', () => 'muziek')
const PROGRAMMES: { value: Programme, label: string }[] = [
  { value: 'muziek', label: 'Muziek' },
  { value: 'sfeermakers', label: 'Sfeermakers' }
]

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
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="opt in SCORE_OPTIONS"
        :key="opt.value"
        class="ww-btn py-0.5! text-sm max-sm:px-2!"
        :class="{ 'ww-btn-active': minScore === opt.value }"
        :title="opt.title"
        @click="minScore = opt.value"
      ><HeartMarks v-if="opt.hearts" v-bind="opt.hearts" size="size-3" inherit class="h-5" /><template v-else>{{ opt.label }}</template></button>
    </div>

    <!-- toon-stage-label + chips in één groep zodat het label mee naar een
         nieuwe regel zakt; sm:ml-3 alleen als het op dezelfde regel als de
         score-groep staat, bij wrappen op telefoon geen inspring zodat het
         uitlijnt met 'score:' -->
    <div v-if="dayHiddenStages.length > 0" class="flex flex-wrap items-center gap-2">
      <span class="font-bold sm:ml-3">podia:</span>
      <button
        v-for="stage in dayHiddenStages"
        :key="stage"
        class="cursor-pointer rounded-full border-[3px] border-black px-3 py-1 text-xs font-bold transition-transform motion-safe:active:scale-95"
        :class="stageColor(stage, programme)"
        :style="{ viewTransitionName: `stage-${slugify(stage)}`, viewTransitionClass: 'ww-chip' }"
        title="toon podium"
        @click="toggleStage(stage)"
      >{{ stage }}</button>
    </div>

    <!-- programmawissel; zelfde chip-stijl als de hartjesfilter. sm:ml-auto duwt
         hem rechts op desktop, maar bij wrappen op telefoon links uitgelijnd zoals
         de hartjeschips -->
    <div class="flex items-center gap-2 sm:ml-auto">
      <button
        v-for="p in PROGRAMMES"
        :key="p.value"
        class="ww-btn py-0.5! text-sm max-sm:px-2!"
        :class="{ 'ww-btn-active': programme === p.value }"
        @click="programme = p.value"
      >{{ p.label }}</button>
    </div>
  </div>
</template>
