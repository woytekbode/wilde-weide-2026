<script setup lang="ts">
/**
 * Rij hartjes als inline-SVG i.p.v. Unicode-glyphs (♥/♡). De glyphs renderen
 * cross-platform verschillend van grootte (op macOS valt het open ♡ terug op
 * een groter font dan het gevulde ♥), waardoor de hover-swap in de editor
 * verspringt. Eén SVG met dezelfde geometrie — alleen de `fill` verschilt — is
 * in beide toestanden even groot, op elk platform.
 *
 * (Een Lucide-UIcon kan dit niet: @nuxt/ui rendert iconen als CSS-mask, dus
 * het open hartje vullen via `fill` werkt daar niet.)
 */
const props = withDefaults(defineProps<{
  /** aantal gevulde (rode) hartjes */
  filled?: number
  /** toon 3 open hartjes (tip) i.p.v. gevulde */
  tip?: boolean
  /** grootte-utility, bv. 'size-4' */
  size?: string
}>(), { filled: 0, tip: false, size: 'size-4' })

// Lucide 'heart'-pad; gevuld = fill currentColor, open = fill none
const HEART_PATH = 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z'
</script>

<template>
  <span class="inline-flex items-center">
    <template v-if="tip">
      <svg
        v-for="n in 3"
        :key="`tip-${n}`"
        :class="[size, 'text-black']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      ><path :d="HEART_PATH" /></svg>
    </template>
    <template v-else>
      <svg
        v-for="n in props.filled"
        :key="`fill-${n}`"
        :class="[size, 'text-red-600']"
        viewBox="0 0 24 24"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      ><path :d="HEART_PATH" /></svg>
    </template>
  </span>
</template>
