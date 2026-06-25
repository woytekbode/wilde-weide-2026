<script setup lang="ts">
import type { Act, DayKey, Programme } from '~/types/program'
import { actTimeStatus, festivalDayKeyFor, minToHour, stageColor } from '~/data/display'

const props = withDefaults(defineProps<{ day: DayKey, programme?: Programme }>(), { programme: 'muziek' })

const SLOT = 15 // minuten per gridrij

/** vaste drempel voor de conflictbadges (voorheen instelbaar via de conflictbalk) */
const CONFLICT_MIN_SCORE = 2
const CONFLICT_INCLUDE_SUGGESTED = false

const { actsForDay, conflictActIds, festival } = useProgramme(props.programme)
const { minScore, hiddenStages, toggleStage, restoreHiddenStages, stageHintPending } = useTimetableFilters(props.programme)
const { show } = useActDetails()

// eenmalige squish-wave over de stagechips zodat (vooral op mobiel, zonder
// hover) duidelijk wordt dat je ze kunt aantikken om de stage te verbergen
const hintSquish = ref(false)

// pas als het grid zelf gehydrateerd is; zie de uitleg bij restoreHiddenStages
onMounted(() => {
  restoreHiddenStages()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (stageHintPending() && !reduce) {
    hintSquish.value = true
    // laatste chip-delay + één animatiecyclus, daarna uit zodat hij niet herhaalt
    setTimeout(() => { hintSquish.value = false }, stages.value.length * 90 + 800)
  }
})

const acts = computed(() => actsForDay(props.day).filter(a => !hiddenStages.value.includes(a.stage)))
const stages = computed(() => festival.stages.filter(s => acts.value.some(a => a.stage === s)))

// Desktop: begrens de grid-breedte tot ~MAX_COL per stagekolom (+ tijdkolom en
// gaten), zodat bij weinig stages (bv. de campingdag met 2) de 1fr-kolommen niet
// over de hele breedte uitrekken — ze vullen tot de cap en lijnen dan links uit.
// Op mobiel geen cap (lg:), dus één stage mag 100% vullen. Bij veel stages is de
// cap groter dan de viewport en doet hij niets; min-w-fit blijft horizontaal scrollen.
const MAX_COL = '22rem'
const gridMaxWidth = computed(() => `calc(2.25rem + ${stages.value.length} * (${MAX_COL} + 5px))`)

const slotStart = computed(() => Math.floor(Math.min(...acts.value.map(a => a.startMin)) / SLOT))
const slotEnd = computed(() => Math.ceil(Math.max(...acts.value.map(a => a.endMin)) / SLOT))
const slotCount = computed(() => slotEnd.value - slotStart.value)

const conflictIds = computed(() => conflictActIds(props.day, CONFLICT_MIN_SCORE, CONFLICT_INCLUDE_SUGGESTED))

const now = useNow()

/** positie van de nu-lijn, alleen op de festivaldag van dit moment */
const nowLine = computed(() => {
  if (now.value === null || festivalDayKeyFor(now.value) !== props.day) return null
  const date = acts.value[0]?.dayDate
  if (!date) return null
  const min = (now.value - new Date(`${date}T00:00:00`).getTime()) / 60000
  if (min < slotStart.value * SLOT || min > slotEnd.value * SLOT) return null
  return {
    row: Math.min(Math.floor(min / SLOT) - slotStart.value + 2, slotCount.value + 1),
    offsetRem: ((min % SLOT) / SLOT) * 1.05
  }
})

const nowLineEl = ref<HTMLElement | null>(null)
const autoScrolled = ref(false)
watch(nowLine, (line) => {
  if (line && !autoScrolled.value) {
    autoScrolled.value = true
    nextTick(() => nowLineEl.value?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }
})

const marks = computed(() => {
  const out: { min: number, hour: boolean }[] = []
  // halfuur-stappen: hele uren krijgen een getal + donkere lijn, halve uren een
  // lichtere lijn zonder getal. <= zodat het sluitende heel uur (bv. 02:00 op de
  // festivalnachten) als laatste schaallabel onderaan het grid meekomt
  const first = Math.ceil((slotStart.value * SLOT) / 30) * 30
  for (let m = first; m <= slotEnd.value * SLOT; m += 30) out.push({ min: m, hour: m % 60 === 0 })
  return out
})

/**
 * Acts op dezelfde stage kunnen overlappen (bv. all-day sets op het Strand).
 * Binnen elke samenhangende overlapgroep krijgen ze naast elkaar een 'lane'.
 */
const lanes = computed(() => {
  const map = new Map<string, { lane: number, laneCount: number }>()
  for (const stage of stages.value) {
    const stageActs = acts.value.filter(a => a.stage === stage).sort((a, b) => a.startMin - b.startMin)
    let group: Act[] = []
    let groupEnd = -1
    const flush = () => {
      const laneEnds: number[] = []
      const assignment = new Map<string, number>()
      for (const act of group) {
        let lane = laneEnds.findIndex(end => end <= act.startMin)
        if (lane === -1) {
          lane = laneEnds.length
          laneEnds.push(act.endMin)
        } else {
          laneEnds[lane] = act.endMin
        }
        assignment.set(act.id, lane)
      }
      for (const act of group) {
        map.set(act.id, { lane: assignment.get(act.id)!, laneCount: laneEnds.length })
      }
      group = []
    }
    for (const act of stageActs) {
      if (group.length > 0 && act.startMin >= groupEnd) flush()
      group.push(act)
      groupEnd = Math.max(groupEnd, act.endMin)
    }
    if (group.length > 0) flush()
  }
  return map
})

/** aantal gridrijen dat een act beslaat; korte blokken krijgen een compactere indeling */
function rowSpan(act: Act) {
  return Math.ceil(act.endMin / SLOT) - Math.floor(act.startMin / SLOT)
}

const hasMarks = (act: Act) => Boolean(act.score || act.status === 'suggested' || act.liveRep)

/* statische lijst zodat Tailwind de line-clamp-utilities genereert */
const LINE_CLAMP = ['', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-4', 'line-clamp-5', 'line-clamp-6']

/**
 * Hoeveel regels de artiestnaam mag beslaan: het verticale budget van de tegel
 * (rijhoogte 1.05rem + 2px gap, minus border/padding) minus de regels die er
 * daadwerkelijk staan (tijd, stijl, hartjes/sterren), gedeeld door de naamregelhoogte.
 */
function nameLines(act: Act): number {
  const rows = rowSpan(act)
  const inner = rows * 1.05 + (rows - 1) * 0.125 - 0.375 - (rows <= 3 ? 0.5 : 0.75)
  let budget = inner - 0.75 // tijdregel + mt-0.5
  if (rows >= 4 && act.style) budget -= 0.78125
  if (hasMarks(act)) budget -= 0.6875
  return Math.min(6, Math.max(1, Math.floor(budget / 0.9375)))
}

function blockStyle(act: Act) {
  const { lane, laneCount } = lanes.value.get(act.id)!
  const col = stages.value.indexOf(act.stage) + 2
  const rowStart = Math.floor(act.startMin / SLOT) - slotStart.value + 2
  const rowEnd = Math.ceil(act.endMin / SLOT) - slotStart.value + 2
  return {
    gridColumn: String(col),
    gridRow: `${rowStart} / ${rowEnd}`,
    width: laneCount > 1 ? `calc(${100 / laneCount}% - 3px)` : undefined,
    marginLeft: laneCount > 1 ? `${(100 / laneCount) * lane}%` : undefined,
    // eigen naam per tegel: bij het (ver)tonen van een stage schuiven de
    // overige kolommen dan zichtbaar dicht i.p.v. te crossfaden
    viewTransitionName: `act-${slugify(act.id)}`,
    viewTransitionClass: 'ww-tile'
  }
}
</script>

<template>
  <!-- Telefoon (-mx-4): links loopt tot de schermrand door (tijdkolom). Rechts
       een pr-4-goot (in de scrollbreedte) zodat de laatste kolom op de content
       uitlijnt i.p.v. tegen de schermrand te plakken — ook bij doorscrollen.
       Desktop (lg): links blijft doorlopen (-ml-8 heft main's pl-8 op, dat oogt
       goed). Rechts lijnt de laatste tegel weer uit op de content/filterkaart,
       maar -mr-3 + pr-3 heffen elkaar op zodat er nog een onzichtbare goot van
       0.75rem (in main's rechterpadding) overblijft waar de hover-zoom van de
       laatste tegel in kan groeien — anders klipt die rand en verschijnt een
       scrollbalk -->
  <div class="-mx-4 overflow-x-auto pb-2 pr-4 lg:-ml-8 lg:-mr-3 lg:pr-3">
    <p v-if="stages.length === 0" class="ww-card-flat px-4 py-3 text-sm font-bold">
      Alle stages van deze dag zijn verborgen — klik op een stage in de filterbalk om er weer een te tonen.
    </p>
    <div
      v-else
      class="grid min-w-fit lg:max-w-(--ww-grid-max)"
      :style="{
        gridTemplateColumns: `2.25rem repeat(${stages.length}, minmax(8.5rem, 1fr))`,
        gridTemplateRows: `auto repeat(${slotCount}, 1.05rem)`,
        columnGap: '5px',
        rowGap: '2px',
        '--ww-grid-max': gridMaxWidth
      }"
    >
      <!-- stagekoppen; klik verbergt de stage (chip verhuist naar de filterbalk) -->
      <button
        v-for="(stage, i) in stages"
        :key="stage"
        class="mb-1.5 cursor-pointer rounded-full border-[3px] border-black py-1 text-center text-xs font-bold transition-transform hover:scale-95 motion-safe:active:scale-95"
        :class="[stageColor(stage, programme), { 'ww-stage-squish': hintSquish }]"
        :style="{ gridColumn: String(i + 2), gridRow: '1', viewTransitionName: `stage-${slugify(stage)}`, viewTransitionClass: 'ww-chip', animationDelay: hintSquish ? `${i * 90}ms` : undefined }"
        title="verberg stage"
        @click="toggleStage(stage)"
      >
        {{ stage }}
      </button>

      <!-- doorlopende tijdkolom-vulling: één item over alle datarijen zodat de
           2px rowGap binnen de span wegvalt en er bij horizontaal scrollen geen
           tegels door gaten heen schemeren; sticky houdt 'm links vast -->
      <div
        class="sticky left-0 z-10 transition-colors duration-500"
        :style="{ gridColumn: '1', gridRow: `2 / span ${slotCount}`, backgroundColor: 'var(--ww-accent)' }"
      />

      <!-- uur-/halfuurmarkeringen: getal + lijn gecentreerd óp de tijdlijn -->
      <div
        v-for="mark in marks"
        :key="mark.min"
        class="pointer-events-none sticky left-0 z-10"
        :style="{ gridColumn: '1', gridRow: String(mark.min / SLOT - slotStart + 2) }"
      >
        <div class="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center gap-1 pr-1.5">
          <!-- halfuren hebben geen getal, dus hun lijn vult ook de getalruimte
               links op en loopt verder door dan de uurlijnen -->
          <span v-if="mark.hour" class="w-4 shrink-0 text-right text-xs font-bold leading-none">{{ minToHour(mark.min) }}</span>
          <span class="h-0 flex-1 border-t-2 border-black/40" />
        </div>
      </div>

      <!-- blokken: acts met ≥1 hartje in de stagekleur, de rest (incl. score 0) wit -->
      <button
        v-for="act in acts"
        :key="act.id"
        class="relative cursor-pointer overflow-hidden rounded-(--ui-radius) border-[3px] border-black text-left transition-transform hover:z-20 hover:scale-[1.02]"
        :class="[
          rowSpan(act) <= 3 ? 'p-1' : 'p-1.5',
          act.score ? stageColor(act.stage, programme) : 'bg-white',
          act.score === 3 ? 'shadow-[3px_3px_0_0_#000]' : act.score === 2 ? 'shadow-[1.5px_1.5px_0_0_#000]' : '',
          !passesScore(act, minScore) ? 'opacity-25' : actTimeStatus(act, now) === 'past' ? 'opacity-40' : ''
        ]"
        :style="blockStyle(act)"
        @click="show(act)"
      >
        <span class="absolute right-1 top-1 flex gap-0.5">
          <span
            v-if="actTimeStatus(act, now) === 'now'"
            class="flex h-4 items-center rounded-full bg-black px-1 text-4xs font-black text-white"
          >NU</span>
          <span
            v-if="act.status === 'suggested'"
            class="flex size-4 items-center justify-center rounded-full border-2 border-black bg-yellow-300 text-4xs font-black"
            title="Tip — nog geen hartjes"
          >?</span>
          <span
            v-if="conflictIds.has(act.id)"
            class="flex size-4 items-center justify-center rounded-full border-2 border-black bg-red-400 text-4xs font-black"
            title="Overlapt met een andere favoriet"
          >!</span>
        </span>
        <!-- ≤2 rijen: te laag voor losse regels, dus artiest en hartjes op één regel -->
        <div v-if="rowSpan(act) <= 2" class="flex items-baseline gap-1">
          <span class="min-w-0 truncate text-xs font-black leading-none">{{ act.artist }}</span>
          <span class="inline-flex shrink-0 items-center text-2xs leading-none">
            <HeartMarks v-if="act.score" :filled="act.score" size="size-2.5" />
            <HeartMarks v-else-if="act.status === 'suggested'" tip size="size-2.5" />
            <span v-if="(act.score || act.status === 'suggested') && act.liveRep" class="mx-0.5 font-bold">/</span>
            <StarMarks v-if="act.liveRep" :count="act.liveRep" size="size-2.5" />
          </span>
        </div>
        <template v-else>
          <div class="text-3xs font-bold leading-none">{{ act.time }}</div>
          <!-- de naam mag zoveel regels wrappen als er in de tegel overblijven -->
          <div class="mt-0.5 text-xs font-black leading-tight" :class="LINE_CLAMP[nameLines(act)]">{{ act.artist }}</div>
          <div v-if="rowSpan(act) >= 4 && act.style" class="truncate text-3xs leading-tight">{{ act.style }}</div>
          <!-- ♥♥ / ✦✦; anders dan op de acts-pagina blijven de sterren ook bij ♥♥♥ staan -->
          <div v-if="hasMarks(act)" class="flex items-center text-2xs leading-none">
            <HeartMarks v-if="act.score" :filled="act.score" size="size-2.5" />
            <HeartMarks v-else-if="act.status === 'suggested'" tip size="size-2.5" />
            <span v-if="(act.score || act.status === 'suggested') && act.liveRep" class="mx-0.5 font-bold">/</span>
            <StarMarks v-if="act.liveRep" :count="act.liveRep" size="size-2.5" />
          </div>
        </template>
      </button>

      <!-- nu-lijn -->
      <div
        v-if="nowLine"
        ref="nowLineEl"
        class="pointer-events-none relative z-20"
        :style="{ gridColumn: '1 / -1', gridRow: String(nowLine.row), marginTop: `${nowLine.offsetRem}rem` }"
      >
        <div class="mt-[-1.5px] border-t-[3px] border-black" />
      </div>
      <!-- tijdlabel van de nu-lijn: over de tijdschaal, sticky bij horizontaal scrollen -->
      <div
        v-if="nowLine"
        class="pointer-events-none sticky left-0 z-30"
        :style="{ gridColumn: '1', gridRow: String(nowLine.row), marginTop: `${nowLine.offsetRem}rem` }"
      >
        <span class="absolute left-0 top-0 -translate-y-1/2 rounded-full bg-black px-1 text-xs font-black text-white">
          {{ now ? new Date(now).toTimeString().slice(0, 5) : '' }}
        </span>
      </div>
    </div>
  </div>
</template>
