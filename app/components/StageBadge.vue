<script setup lang="ts">
import { stageColor } from '~/data/display'
import type { Programme } from '~/types/program'

withDefaults(defineProps<{ stage: string, size?: 'xs' | 'sm', programme?: Programme }>(), { programme: 'muziek' })
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border-2 border-black font-bold whitespace-nowrap"
    :class="[stageColor(stage, programme), size === 'xs' ? 'px-1.5 text-[10px]' : 'px-2 py-0.5 text-xs']"
  >
    {{ stage }}
  </span>
</template>
