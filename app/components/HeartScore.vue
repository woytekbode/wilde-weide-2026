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

// hover-preview/X-morph alleen voor een echte muis: op touch vuurt pointerenter
// óók (type 'touch') maar pointerleave pas bij de volgende tik elders, waardoor
// 'hovered' blijft plakken. Op touch laten we 'hovered' dus op 0 — tikken zet/
// wist de score via clickHeart, zonder sticky preview.
function enterHeart(e: PointerEvent, n: number) {
  if (e.pointerType === 'mouse') hovered.value = n
}
function leaveHearts(e: PointerEvent) {
  if (e.pointerType === 'mouse') hovered.value = 0
}

// hover je precies het hartje dat gelijk is aan de huidige score, dan wist een
// klik de score; toon de gevulde hartjes dan zwart i.p.v. rood als verwijder-hint
const removeHover = computed(() => hovered.value > 0 && hovered.value === props.act.score)

// gevuld hartje (♥) o.b.v. hover-preview of de echte score
function filled(n: number) {
  return n <= (hovered.value || props.act.score || 0)
}

// in de verwijder-hover morphen de gevulde hartjes naar een X (klik = weghalen)
function showX(n: number) {
  return removeHover.value && n <= (props.act.score || 0)
}

const xSize = computed(() => props.size === 'lg' ? 'size-6' : 'size-4')

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
        @pointerleave="leaveHearts"
      >
        <button
          v-for="n in 3"
          :key="n"
          class="relative cursor-pointer px-px leading-none"
          :class="heartSize"
          :title="act.score === n ? 'Klik nogmaals: hartjes weg' : HEART_LABELS[n]"
          @pointerenter="enterHeart($event, n)"
          @click="clickHeart(n)"
        >
          <!-- hartje en X gestapeld; in de verwijder-hover draait het hartje weg
               en de X erin, net als de tijdreis-knop -->
          <span
            class="block transition-all duration-200 ease-out"
            :class="[
              filled(n) ? (removeHover ? 'text-black' : 'text-red-600') : 'text-black',
              showX(n) ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100'
            ]"
          >{{ filled(n) ? '♥' : '♡' }}</span>
          <span
            class="absolute inset-0 flex items-center justify-center text-black transition-all duration-200 ease-out"
            :class="showX(n) ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0'"
            aria-hidden="true"
          ><UIcon name="i-lucide-x" :class="xSize" /></span>
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
