<script setup lang="ts">
import { stageColor } from '~/data/display'

defineProps<{ stage: string, size?: 'xs' | 'sm' }>()
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border-2 border-black font-bold whitespace-nowrap"
    :class="[stageColor(stage), size === 'xs' ? 'px-1.5 text-[10px]' : 'px-2 py-0.5 text-xs']"
  >
    {{ stage }}
  </span>
</template>
