<script setup lang="ts">
import { actTimeStatus, DAY_META, genreColor } from '~/data/display'
import type { Act, Programme } from '~/types/program'

definePageMeta({ wwBg: 'oker' })

// muziek- of sfeermaker-programma; gedeelde state met het blokkenschema en de filterbalk
const programme = useState<Programme>('programme', () => 'muziek')

// beide programma's vooraf opbouwen en reactief omschakelen, zodat de toggle
// in de filterbalk de lijst meteen ververst (geen remount/navigatie nodig)
const musicFiltered = useFilteredActs('muziek')
const sfeerFiltered = useFilteredActs('sfeermakers')
const filteredActs = computed(() => programme.value === 'sfeermakers' ? sfeerFiltered.value : musicFiltered.value)

// Sfeermaker-activiteiten komen vaak op meerdere tijdstippen terug; toon er per
// activiteit (scoreKey) één kaart. De lijst is al op dag/tijd gesorteerd, dus de
// eerste sessie is de representant. Muziek blijft per optreden.
const cards = computed(() => {
  if (programme.value !== 'sfeermakers') return filteredActs.value
  const seen = new Set<string>()
  return filteredActs.value.filter((a) => {
    if (seen.has(a.scoreKey)) return false
    seen.add(a.scoreKey)
    return true
  })
})

const musicProg = useProgramme('muziek')
const sfeerProg = useProgramme('sfeermakers')
const { show } = useActDetails()
const now = useNow()

// conflictbadges: dezelfde drempel als in het blokkenschema (TimetableGrid),
// maar hier samengevoegd over alle dagen omdat de acts-lijst niet per dag splitst
const CONFLICT_MIN_SCORE = 2
const conflictIds = computed(() => {
  const conflictActIds = (programme.value === 'sfeermakers' ? sfeerProg : musicProg).conflictActIds
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
    <ActFilterBar :key="programme" :programme="programme" />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        v-for="act in cards"
        :key="act.id"
        class="ww-card relative flex cursor-pointer flex-col p-3.5 text-left transition-transform hover:scale-[1.02]"
        :class="[
          // schaduw schaalt met de score: 3 hartjes 6px, 2 hartjes 3px, rest vlak
          act.score === 3 ? 'shadow-[6px_6px_0_0_#000]!' : act.score === 2 ? 'shadow-[3px_3px_0_0_#000]!' : 'shadow-none!',
          // afgelopen-dimming alleen voor muziek (per optreden); sfeermaker-kaarten
          // staan voor een activiteit met meerdere sessies, dus niet dimmen
          programme === 'muziek' && actTimeStatus(act, now) === 'past' ? 'opacity-40 grayscale' : ''
        ]"
        @click="show(act)"
      >
        <!-- statusbadges rechtsboven, zoals op de blokkenschema-tegels -->
        <span class="absolute right-1.5 top-1.5 flex gap-0.5">
          <span
            v-if="act.status === 'suggested'"
            class="flex size-5 items-center justify-center rounded-full border-2 border-black bg-yellow-300 text-3xs font-black"
            title="Tip — nog geen hartjes"
          >?</span>
          <span
            v-if="conflictIds.has(act.id)"
            class="flex size-5 items-center justify-center rounded-full border-2 border-black bg-red-400 text-3xs font-black"
            title="Overlapt met een andere favoriet"
          >!</span>
        </span>
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <!-- dag/tijd alleen voor muziek (per optreden); sfeermaker-kaarten
               tonen alleen plek + categorie, de tijden staan in het Programma -->
          <span
            v-if="programme === 'muziek' && actTimeStatus(act, now) === 'now'"
            class="rounded-full border-2 border-black bg-black px-1.5 py-0.5 text-3xs font-black text-white"
          >NU</span>
          <span v-if="programme === 'muziek'" class="rounded-full border-2 border-black px-1.5 text-3xs font-mono" :class="dayAccent(act)">
            {{ dayShort(act) }} {{ act.time }}
          </span>
          <!-- sfeermaker zonder plek (ambient): toon het type i.p.v. een lege pil -->
          <span v-if="act.timeless && act.type" class="rounded-full border-2 border-black bg-veld-300 px-1.5 text-3xs">
            {{ act.type }}
          </span>
          <StageBadge v-if="act.stage" :stage="act.stage" :programme="act.programme" size="xs" />
          <span v-if="act.genre" class="rounded-full border-2 border-black px-1.5 text-3xs" :class="genreColor(act.genre, act.programme)">
            {{ act.genre }}
          </span>
        </div>
        <h3 class="font-display text-xl font-black leading-tight">{{ act.artist }}</h3>
        <div v-if="act.style" class="mt-0.5 text-xs font-bold text-stone-600">{{ act.style }}</div>
        <div class="mt-0.5 flex">
          <HeartScore :act="act" show-live-rep />
        </div>
        <p class="mt-2 line-clamp-3 text-sm">{{ act.description }}</p>
      </button>
    </div>

    <p class="text-sm font-bold">{{ cards.length }} {{ programme === 'sfeermakers' ? 'sfeermakers' : 'artiesten' }}</p>
  </div>
</template>
