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

// in de verwijder-hover morphen de gevulde hartjes naar een doorgestreept
// hartje (heart-off; klik = weghalen)
function showX(n: number) {
  return removeHover.value && n <= (props.act.score || 0)
}

const xSize = computed(() => props.size === 'lg' ? 'size-5' : 'size-3.5')

const showEditorAlways = computed(() => props.editor && canEdit)

// reputatie naast de hartjes: '♥♥ / ✦✦✦'; met hartjes ervoor een scheidings-' / '
const showLiveRepStars = computed(() => Boolean(props.showLiveRep && props.act.liveRep))
const liveRepHasHearts = computed(() => Boolean(props.act.score) || props.act.status === 'suggested')
</script>

<template>
  <span class="inline-flex items-center" @click.stop>
    <span class="group/hearts relative inline-flex items-center">
      <!-- compacte weergave; verdwijnt op hover als er een editor is -->
      <span
        v-if="!showEditorAlways"
        class="inline-flex items-center text-base leading-none"
        :class="{ 'group-hover/hearts:hidden': canEdit }"
      >
        <HeartMarks v-if="act.score" :filled="act.score" size="size-3.5" :title="`Onze hartjes: ${act.score}/3`" />
        <HeartMarks v-else-if="act.status === 'suggested'" tip size="size-3.5" title="Tip — nog geen hartjes" />
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
          :title="act.score === n ? 'Klik nogmaals: hartjes weg' : HEART_LABELS[n]"
          @pointerenter="enterHeart($event, n)"
          @click="clickHeart(n)"
        >
          <!-- hartje en heart-off gestapeld; in de verwijder-hover faden ze in
               elkaar over (beide zijn een hartje, dus geen draai) -->

          <span
            class="block transition-all duration-200 ease-out"
            :class="[
              filled(n) ? (removeHover ? 'text-black' : 'text-red-600') : 'text-black',
              showX(n) ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
            ]"
          ><svg
            :class="xSize"
            viewBox="0 0 24 24"
            :fill="filled(n) ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          ><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></svg></span>
          <span
            class="absolute inset-0 flex items-center justify-center text-black transition-all duration-200 ease-out"
            :class="showX(n) ? 'scale-100 opacity-100' : 'scale-75 opacity-0'"
            aria-hidden="true"
          ><UIcon name="i-lucide-heart-off" :class="xSize" /></span>
        </button>
      </span>
    </span>

    <span
      v-if="showLiveRepStars"
      class="inline-flex items-center text-sm font-bold leading-none"
      :title="`Reputatie: ${act.liveRep}/3`"
    >
      <span v-if="liveRepHasHearts" class="mx-1">/</span>
      <StarMarks :count="act.liveRep ?? 0" size="size-3.5" />
    </span>
  </span>
</template>
