<script setup lang="ts">
/**
 * Rij gevulde Lucide-sterren voor de live-reputatie (voorheen de ✦-glyph).
 * Inline-SVG net als HeartMarks, zodat de sterren cross-platform even groot
 * zijn en in dezelfde stijl gevuld worden als de gevulde hartjes. De kleur
 * volgt currentColor, dus de ster erft de tekstkleur van zijn context.
 */
const props = withDefaults(defineProps<{
  /** aantal sterren */
  count?: number
  /** grootte-utility, bv. 'size-4' */
  size?: string
}>(), { count: 0, size: 'size-4' })

const STAR_PATH = 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.39 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.153 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'
</script>

<template>
  <span class="inline-flex items-center">
    <svg
      v-for="n in props.count"
      :key="n"
      :class="size"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    ><path :d="STAR_PATH" /></svg>
  </span>
</template>
