<script setup lang="ts">
import { DAY_META, genreColor } from '~/data/display'

const { act, open } = useActDetails()
const { canEdit, setSuggested } = useScoring()

// Vergrendel het scrollen op <html> zelf zolang de modal open is. De scrollbar
// verdwijnt dan, terwijl scrollbar-gutter: stable (main.css) de 14px gereserveerd
// houdt — dus geen sprong naar links en geen losse paarse gutter naast de modal.
// (Reka vergrendelt standaard alleen <body>, waardoor de gutter zichtbaar bleef.)
if (import.meta.client) {
  watch(open, (isOpen) => {
    document.documentElement.classList.toggle('modal-open', isOpen)
  })
  onScopeDispose(() => document.documentElement.classList.remove('modal-open'))
}

const dayMeta = computed(() => DAY_META.find(d => d.key === act.value?.dayKey))

// Sfeermaker-activiteiten komen vaak op meerdere tijdstippen terug (één score per
// activiteit). Toon in plaats van één tijdslot álle sessies van deze activiteit,
// op dag-kleur, gesorteerd op dag/tijd.
const { acts: sfeerActs } = useProgramme('sfeermakers')
const sessions = computed(() => {
  const a = act.value
  if (!a || a.programme !== 'sfeermakers' || a.timeless) return []
  return sfeerActs.value
    .filter(s => s.scoreKey === a.scoreKey && !s.timeless)
    .slice()
    .sort((x, y) => x.dayDate.localeCompare(y.dayDate) || x.startMin - y.startMin)
    .map(s => ({
      key: s.id,
      label: `${DAY_META.find(d => d.key === s.dayKey)?.shortLabel ?? ''} ${s.time}`,
      accent: DAY_META.find(d => d.key === s.dayKey)?.accentSoft ?? ''
    }))
})

const curatorLine = computed(() => {
  if (!act.value?.curator) return null
  return act.value.curator === 'curator' ? 'is zelf curator van een takeover' : `gecureerd door ${act.value.curator}`
})

/** style · type · country, zonder lege delen (concept-acts hebben vaak alleen een type) */
const metaLine = computed(() =>
  [act.value?.style, act.value?.type, act.value?.country].filter(Boolean).join(' · ')
)
</script>

<template>
  <USlideover v-model:open="open" side="bottom">
    <template #content>
      <div v-if="act" class="max-h-[85vh] overflow-y-auto border-t-[3px] border-black bg-white p-5 pb-10">
        <div class="mx-auto max-w-2xl space-y-4">
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-display text-3xl font-black leading-tight">{{ act.artist }}</h2>
            <button class="ww-btn-solid shrink-0 px-3!" aria-label="Sluiten" @click="open = false">✕</button>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-sm font-bold">
            <!-- muziek: één tijdslot. sfeermaker-activiteit: alle sessies (dag-kleur) -->
            <span
              v-if="act.programme === 'muziek' && !act.timeless"
              class="rounded-full border-2 border-black px-2 py-0.5 text-xs"
              :class="dayMeta?.accentSoft"
            >{{ dayMeta?.label }} · {{ act.time }}</span>
            <span
              v-for="s in sessions"
              :key="s.key"
              class="rounded-full border-2 border-black px-2 py-0.5 text-xs"
              :class="s.accent"
            >{{ s.label }}</span>
            <StageBadge v-if="act.stage" :stage="act.stage" :programme="act.programme" />
            <span v-if="act.genre" class="rounded-full border-2 border-black px-2 py-0.5 text-xs" :class="genreColor(act.genre, act.programme)">
              {{ act.genre }}
            </span>
          </div>

          <!-- hartjes geven (vind ik leuk), of als tip markeren via het ?-icoon
               (wit uit, geel aan, net als ♡→♥). Beide sluiten elkaar uit. -->
          <div v-if="canEdit" class="inline-flex items-center gap-3 text-sm font-bold">
            <div class="flex items-center gap-2">
              <HeartScore :act="act" editor size="lg" />
              <span>vind ik leuk</span>
            </div>
            <span class="text-xl font-black text-black/30 select-none">/</span>
            <button
              class="group flex cursor-pointer items-center gap-1.5"
              :title="act.status === 'suggested' ? 'haal tip weg' : 'tip je vrienden'"
              :aria-pressed="act.status === 'suggested'"
              @click="setSuggested(act, act.status !== 'suggested')"
            >
              <span>tip vrienden</span>
              <!-- uit: hover vult geel voor (toevoegen). aan: geel; op hover
                   zwart met een kruisje (klik = weghalen) -->
              <span
                class="flex size-5 items-center justify-center rounded-full border-2 border-black text-[10px] font-black transition-colors"
                :class="act.status === 'suggested' ? 'bg-yellow-300 text-black group-hover:bg-black group-hover:text-white' : 'bg-white group-hover:bg-yellow-300'"
              >
                <template v-if="act.status === 'suggested'">
                  <span class="group-hover:hidden">?</span>
                  <span class="hidden group-hover:inline">✕</span>
                </template>
                <template v-else>?</template>
              </span>
            </button>
          </div>

          <div class="text-sm font-bold text-stone-700">
            {{ metaLine }}
            <template v-if="act.host"> · onderdeel van {{ act.host }}</template>
            <template v-if="curatorLine"> · {{ curatorLine }}</template>
          </div>

          <p v-if="act.description" class="text-base">{{ act.description }}</p>

          <div v-if="act.liveImpression" class="ww-card-flat bg-stone-50 p-3 text-sm">
            <div class="mb-1 inline-flex items-center font-bold">Reputatie&nbsp;(<StarMarks :count="act.liveRep ?? 0" size="size-3.5" />)</div>
            {{ act.liveImpression }}
          </div>

          <a
            v-if="act.spotify"
            :href="act.spotify"
            target="_blank"
            rel="noopener"
            class="ww-btn-solid"
          >▶ Luister op Spotify</a>
        </div>
      </div>
    </template>
  </USlideover>
</template>
