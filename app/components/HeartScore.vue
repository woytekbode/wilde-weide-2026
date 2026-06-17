<script setup lang="ts">
import type { Act } from '~/types/program'

/**
 * Hartjes-score ('vind ik leuk'). Weergave: gevulde hartjes per score, drie
 * open hartjes voor tips. In dev verschijnt op hover (of altijd, met `editor`)
 * een klikbare 3-hartjes-editor; klikken op de huidige score doet niets.
 */
const props = defineProps<{
  act: Act
  /** toon de editor altijd (detail-slideover) i.p.v. alleen op hover */
  editor?: boolean
  /** toon de reputatie (✦) erachter */
  showLiveRep?: boolean
  /** grotere hartjes voor de detailweergave; standaard compact */
  size?: 'md' | 'lg'
}>()

const { canEdit, setScore } = useScoring()
const hovered = ref(0)

// niveaus van 'vind ik leuk', gebruikt in de hartje-tooltips
const HEART_LABELS = ['', 'leuk', 'heel leuk', 'moet ik zien']

// grotere klikbare hartjes in de detail-slideover; compact (text-base) elders
const heartSize = computed(() => props.size === 'lg' ? 'text-2xl' : 'text-base')

// klikken op je huidige score zet hem terug naar 0 (beoordeeld, niet voor ons)
function clickHeart(n: number) {
  setScore(props.act, props.act.score === n ? 0 : n)
}

// hover je precies het hartje dat gelijk is aan de huidige score, dan wist een
// klik de score; toon de gevulde hartjes dan zwart i.p.v. rood als verwijder-hint
const removeHover = computed(() => hovered.value > 0 && hovered.value === props.act.score)

const showEditorAlways = computed(() => props.editor && canEdit)

// reputatie naast de hartjes: '♥♥ / ✦✦✦'; zonder hartjes alleen de sterren
const liveRepSuffix = computed(() => {
  if (!props.showLiveRep || !props.act.liveRep) return ''
  const stars = '✦'.repeat(props.act.liveRep)
  const hasHearts = Boolean(props.act.score) || props.act.status === 'suggested'
  return hasHearts ? ` / ${stars}` : stars
})
</script>

<template>
  <span class="inline-flex items-center gap-1" @click.stop>
    <span class="group/hearts relative inline-flex items-center">
      <!-- compacte weergave; verdwijnt op hover als er een editor is -->
      <span
        v-if="!showEditorAlways"
        class="inline-flex items-center text-base leading-none"
        :class="{ 'group-hover/hearts:hidden': canEdit }"
      >
        <span v-if="act.score" class="text-red-600" :title="`Onze hartjes: ${act.score}/3`">{{ '♥'.repeat(act.score) }}</span>
        <span v-else-if="act.status === 'suggested'" title="Tip — nog geen hartjes">♡♡♡</span>
      </span>

      <!-- editor: drie klikbare hartjes (alleen in dev) -->
      <span
        v-if="canEdit"
        class="items-center"
        :class="showEditorAlways ? 'inline-flex' : 'hidden group-hover/hearts:inline-flex'"
        @mouseleave="hovered = 0"
      >
        <button
          v-for="n in 3"
          :key="n"
          class="cursor-pointer px-px leading-none"
          :class="[heartSize, n <= (hovered || act.score || 0) ? (removeHover ? 'text-black' : 'text-red-600') : 'text-black']"
          :title="act.score === n ? 'Klik nogmaals: hartjes weg' : HEART_LABELS[n]"
          @mouseenter="hovered = n"
          @click="clickHeart(n)"
        >
          {{ n <= (hovered || act.score || 0) ? '♥' : '♡' }}
        </button>
      </span>
    </span>

    <span
      v-if="liveRepSuffix"
      class="text-sm font-bold leading-none"
      :title="`Reputatie: ${act.liveRep}/3`"
    >{{ liveRepSuffix }}</span>
  </span>
</template>
