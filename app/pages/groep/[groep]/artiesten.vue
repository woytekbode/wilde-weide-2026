<script setup lang="ts">
import { actTimeStatus, DAY_META, genreColor } from '~/data/display'
import type { Act } from '~/types/program'

definePageMeta({ wwBg: 'oker' })

const filteredActs = useFilteredActs()
const { conflictActIds } = useActs()
const { show } = useActDetails()
const now = useNow()

// conflictbadges: dezelfde drempel als in het blokkenschema (TimetableGrid),
// maar hier samengevoegd over alle dagen omdat de acts-lijst niet per dag splitst
const CONFLICT_MIN_SCORE = 2
const conflictIds = computed(() => {
  const ids = new Set<string>()
  for (const d of DAY_META) {
    for (const id of conflictActIds(d.key, CONFLICT_MIN_SCORE, false)) ids.add(id)
  }
  return ids
})

function dayShort(act: Act): string {
  return DAY_META.find(d => d.key === act.dayKey)?.shortLabel ?? ''
}

function dayAccent(act: Act): string {
  return DAY_META.find(d => d.key === act.dayKey)?.accentSoft ?? ''
}
</script>

<template>
  <div class="space-y-4">
    <ActFilterBar />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="act in filteredActs"
        :key="act.id"
        class="ww-card relative flex cursor-pointer flex-col p-3.5 text-left transition-transform hover:scale-[1.02]"
        :class="[
          // schaduw schaalt met de score: 3 hartjes 6px, 2 hartjes 3px, rest vlak
          act.score === 3 ? 'shadow-[6px_6px_0_0_#000]!' : act.score === 2 ? 'shadow-[3px_3px_0_0_#000]!' : 'shadow-none!',
          actTimeStatus(act, now) === 'past' ? 'opacity-40 grayscale' : ''
        ]"
        @click="show(act)"
      >
        <!-- statusbadges rechtsboven, zoals op de blokkenschema-tegels -->
        <span class="absolute right-1.5 top-1.5 flex gap-0.5">
          <span
            v-if="act.status === 'suggested'"
            class="flex size-5 items-center justify-center rounded-full border-2 border-black bg-yellow-300 text-[10px] font-black"
            title="Tip — nog geen hartjes"
          >?</span>
          <span
            v-if="conflictIds.has(act.id)"
            class="flex size-5 items-center justify-center rounded-full border-2 border-black bg-red-400 text-[10px] font-black"
            title="Overlapt met een andere favoriet"
          >!</span>
        </span>
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span
            v-if="actTimeStatus(act, now) === 'now'"
            class="rounded-full border-2 border-black bg-black px-1.5 py-0.5 text-[10px] font-black text-white"
          >NU</span>
          <span class="rounded-full border-2 border-black px-1.5 text-[10px] font-mono" :class="dayAccent(act)">
            {{ dayShort(act) }} {{ act.time }}
          </span>
          <StageBadge :stage="act.stage" size="xs" />
          <span v-if="act.genre" class="rounded-full border-2 border-black px-1.5 text-[10px]" :class="genreColor(act.genre)">
            {{ act.genre }}
          </span>
        </div>
        <h3 class="font-display text-xl font-black leading-tight">{{ act.artist }}</h3>
        <div class="mt-0.5 text-xs font-bold text-stone-600">{{ act.style }}</div>
        <div class="mt-0.5 flex">
          <HeartScore :act="act" show-live-rep />
        </div>
        <p class="mt-2 line-clamp-3 text-sm">{{ act.description }}</p>
      </button>
    </div>

    <p class="text-sm font-bold">{{ filteredActs.length }} artiesten</p>
  </div>
</template>
