<script setup lang="ts">
import type { LikeAggregateMap, StatsResponse } from '#shared/groep'
import { buildActs, useActs } from '~/composables/useActs'
import { genreColor, stageColor } from '~/data/display'
import type { Act } from '~/types/program'

// rijen zijn alleen klikbaar binnen een groep (de slideover-scoring hoort niet
// op de groeploze badmeester-pagina); show() opent de gedeelde act-slideover
const { groep } = useGroep()
const { show } = useActDetails()

// reactieve acts mét de score van déze groep (de groep.client-plugin schrijft de
// KV-scores in deze state) — zo zie je in de top-10 welke acts je zelf al gaf
const { acts: programmaActs } = useActs()
const groepScores = computed(() => {
  const m = new Map<string, number>()
  for (const a of programmaActs.value) if (a.score) m.set(a.scoreKey, a.score)
  return m
})
const groepScore = (scoreKey: string): number => groepScores.value.get(scoreKey) ?? 0

const totaal = ref({ groepen: 0, likes: 0, active: 0 })
const likes = ref<LikeAggregateMap>({})
const bezig = ref(true)
const fout = ref('')
const alleStages = ref(false)
const alleActs = ref(false)

// muziek-acts (scoreKey === act.id) zodat we de geaggregeerde likes per scoreKey
// aan podium/genre/artiest kunnen koppelen; statische data, dus buiten reactiviteit
const actByKey = new Map(buildActs().map(a => [a.scoreKey, a]))

// aantal geprogrammeerde muziek-acts per genre — de noemer voor het gemiddelde,
// zodat een genre met véél acts (electronic) niet automatisch bovenaan staat
const genreActCount = new Map<string, number>()
for (const a of actByKey.values()) {
  if (a.genre) genreActCount.set(a.genre, (genreActCount.get(a.genre) ?? 0) + 1)
}

async function laad() {
  bezig.value = true
  fout.value = ''
  try {
    const res = await $fetch<StatsResponse>('/api/stats')
    totaal.value = res.totaal
    likes.value = res.likes
  } catch {
    fout.value = 'Laden mislukt — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}

onMounted(() => {
  herstelVerborgenGenres()
  herstelVerborgenStages()
  laad()
})

interface Joined { act: Act, hearts: number, groups: number, suggested: number }

/** geaggregeerde likes gekoppeld aan de muziek-act (sfeermaker-keys vallen weg) */
const joined = computed<Joined[]>(() => {
  const out: Joined[] = []
  for (const key in likes.value) {
    const act = actByKey.get(key)
    if (!act) continue
    out.push({ act, ...likes.value[key]! })
  }
  return out
})

// lichte genrefilter: alleen voor de Acts-top-10. Leeg = alles tonen; een genre
// in de set wordt uit de top-10 weggelaten (Podia/Genres blijven globaal). Je
// bouwt de filter op door een genre-badge ín een act-rij aan te tikken. De keuze
// blijft per device bewaard (localStorage), net als de verborgen stages.
const VERBORGEN_GENRES_LS_KEY = 'toppers-hidden-genres'
const verborgenGenres = useState<Set<string>>('toppers-hidden-genres', () => new Set())

function toggleGenre(g: string) {
  const next = new Set(verborgenGenres.value)
  if (next.has(g)) next.delete(g)
  else next.add(g)
  verborgenGenres.value = next
  try {
    localStorage.setItem(VERBORGEN_GENRES_LS_KEY, JSON.stringify([...next]))
  } catch { /* storage vol/geblokkeerd: filter werkt dan alleen deze sessie */ }
}

/** verborgen genres terughalen uit localStorage (client-only, na mount) */
function herstelVerborgenGenres() {
  try {
    const opgeslagen = JSON.parse(localStorage.getItem(VERBORGEN_GENRES_LS_KEY) ?? '[]')
    if (Array.isArray(opgeslagen) && opgeslagen.length) verborgenGenres.value = new Set(opgeslagen)
  } catch { /* onleesbaar → alle genres zichtbaar */ }
}

// zelfde lichte filter, maar op podium: tik een stage-badge in een act-rij aan om
// dat podium uit de Acts-top te laten vallen. Eigen localStorage-key, los van de
// timetable-stagefilter (useTimetableFilters).
const VERBORGEN_STAGES_LS_KEY = 'toppers-hidden-stages'
const verborgenStages = useState<Set<string>>('toppers-hidden-stages', () => new Set())

function toggleStage(s: string) {
  const next = new Set(verborgenStages.value)
  if (next.has(s)) next.delete(s)
  else next.add(s)
  verborgenStages.value = next
  try {
    localStorage.setItem(VERBORGEN_STAGES_LS_KEY, JSON.stringify([...next]))
  } catch { /* storage vol/geblokkeerd: filter werkt dan alleen deze sessie */ }
}

/** verborgen podia terughalen uit localStorage (client-only, na mount) */
function herstelVerborgenStages() {
  try {
    const opgeslagen = JSON.parse(localStorage.getItem(VERBORGEN_STAGES_LS_KEY) ?? '[]')
    if (Array.isArray(opgeslagen) && opgeslagen.length) verborgenStages.value = new Set(opgeslagen)
  } catch { /* onleesbaar → alle podia zichtbaar */ }
}

/** top 20 acts; gefilterd op genre, primair op gewogen hartjes, dan op groepen */
const topActs = computed(() =>
  joined.value
    .filter(j => (!j.act.genre || !verborgenGenres.value.has(j.act.genre))
      && !verborgenStages.value.has(j.act.stage))
    .sort((a, b) => b.hearts - a.hearts || b.groups - a.groups)
    .slice(0, 20)
)

// eerste 10 altijd zichtbaar; de volgende 10 staan ingeklapt achter de chevron,
// net als de extra podia hieronder
const eersteActs = computed(() => topActs.value.slice(0, 10))
const extraActs = computed(() => topActs.value.slice(10))

interface StageRow { stage: string, hearts: number, groups: number, acts: number, avg: number }
const stages = computed<StageRow[]>(() => {
  const m = new Map<string, { hearts: number, groups: number, acts: number }>()
  for (const j of joined.value) {
    const s = m.get(j.act.stage) ?? { hearts: 0, groups: 0, acts: 0 }
    s.hearts += j.hearts
    s.groups += j.groups
    s.acts += 1
    m.set(j.act.stage, s)
  }
  return [...m.entries()]
    .map(([stage, v]) => ({ stage, ...v, avg: v.hearts / v.acts }))
    .sort((a, b) => b.hearts - a.hearts)
})

// eerste 3 altijd zichtbaar; de rest staat ingeklapt in de DOM zodat de
// uitklap-animatie (grid-rows 0fr→1fr) ze kan onthullen
const eersteStages = computed(() => stages.value.slice(0, 3))
const extraStages = computed(() => stages.value.slice(3))

// Per genre op gewogen hartjes gedeeld door het aantal geprogrammeerde acts in
// dat genre: zo meet je de gemiddelde waardering per act i.p.v. het genre met de
// meeste acts. `totalActs` staat erbij zodat je kleine (wisselvallige) genres ziet.
interface GenreRow { genre: string, hearts: number, likedActs: number, totalActs: number, avg: number }
const genres = computed<GenreRow[]>(() => {
  const m = new Map<string, { hearts: number, likedActs: number }>()
  for (const j of joined.value) {
    if (!j.act.genre) continue
    const g = m.get(j.act.genre) ?? { hearts: 0, likedActs: 0 }
    g.hearts += j.hearts
    g.likedActs += 1
    m.set(j.act.genre, g)
  }
  return [...m.entries()]
    .map(([genre, v]) => {
      const totalActs = genreActCount.get(genre) ?? v.likedActs
      return { genre, hearts: v.hearts, likedActs: v.likedActs, totalActs, avg: v.hearts / totalActs }
    })
    .sort((a, b) => b.avg - a.avg)
})
// bar relatief aan het sterkste genre (avg is geen fractie van een geheel)
const maxGenreAvg = computed(() => Math.max(0, ...genres.value.map(g => g.avg)))

const leeg = computed(() => joined.value.length === 0)
const pct = (n: number) => `${Math.round(n * 100)}%`
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 pt-4">
    <p v-if="bezig" class="text-sm font-bold">Laden…</p>
    <p v-else-if="fout" class="text-sm font-bold text-red-700">{{ fout }}</p>

    <template v-else>
      <div class="ww-card flex items-center justify-around gap-4 p-5 text-center">
        <div>
          <div class="font-display text-4xl font-black tabular-nums">{{ totaal.groepen }}</div>
          <div class="text-sm font-bold">groepen</div>
        </div>
        <div>
          <div class="font-display text-4xl font-black tabular-nums">{{ totaal.active }}</div>
          <div class="text-sm font-bold">actief</div>
        </div>
        <div>
          <div class="font-display text-4xl font-black tabular-nums">{{ totaal.likes }}</div>
          <div class="text-sm font-bold">hartjes</div>
        </div>
      </div>

      <p v-if="leeg" class="ww-card p-5 text-sm font-bold text-black/60">
        Nog geen hartjes uitgedeeld.
      </p>

      <template v-else>
        <!-- Genre-filterkaart, zoals de filterbalk op de andere pagina's. Altijd
             zichtbaar: zonder actief filter een hint, anders de verborgen genres
             als pills. Tik een pill aan om dat genre weer terug te halen. -->
        <section class="ww-card flex flex-col gap-1.5 p-3">
          <div v-if="verborgenStages.size" class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="s in verborgenStages"
              :key="s"
              class="inline-flex items-center gap-0.5 rounded-full border-2 border-black py-px pl-1.5 pr-1 text-3xs font-bold whitespace-nowrap transition hover:brightness-95"
              :class="stageColor(s)"
              @click="toggleStage(s)"
            >{{ s }}<UIcon name="i-lucide-x" class="size-3" /></button>
          </div>
          <div v-if="verborgenGenres.size" class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="g in verborgenGenres"
              :key="g"
              class="inline-flex items-center gap-0.5 rounded-full border-2 border-black py-px pl-1.5 pr-1 text-3xs font-bold whitespace-nowrap transition hover:brightness-95"
              :class="genreColor(g)"
              @click="toggleGenre(g)"
            >{{ g }}<UIcon name="i-lucide-x" class="size-3" /></button>
          </div>
          <p v-if="!verborgenGenres.size && !verborgenStages.size" class="text-2xs font-bold text-black/40">
            Klik op een podium of genre om te filteren.
          </p>
        </section>

        <!-- Top 10 acts: gewogen hartjes (1/2/3) opgeteld over alle groepen -->
        <section class="ww-card overflow-hidden">
          <div class="border-b-[3px] border-black bg-lila-200 px-4 py-2">
            <h2 class="font-display text-lg font-black">Acts</h2>
          </div>

          <p v-if="!topActs.length" class="px-4 py-3 text-sm font-bold text-black/60">
            Geen acts
          </p>
          <TransitionGroup v-else tag="ol" name="topper" class="relative divide-y-2 divide-black/10">
            <component
              :is="groep ? 'button' : 'div'"
              v-for="(row, i) in eersteActs"
              :key="row.act.id"
              class="flex w-full items-start gap-3 px-4 py-2.5 text-left"
              :class="groep ? 'cursor-pointer transition hover:bg-black/5 motion-safe:active:scale-[0.99]' : ''"
              @click="groep && show(row.act)"
            >
              <span class="w-5 shrink-0 self-center text-center font-display text-lg font-black tabular-nums text-black/40">{{ i + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold leading-none">{{ row.act.artist }}</div>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <HeartMarks
                    v-if="groepScore(row.act.scoreKey)"
                    :filled="groepScore(row.act.scoreKey)"
                    size="size-2.5"
                    :title="`Jullie hartjes: ${groepScore(row.act.scoreKey)}/3`"
                  />
                  <button
                    type="button"
                    class="inline-flex cursor-pointer transition hover:brightness-95"
                    title="Verberg dit podium uit de top-10"
                    @click.stop="toggleStage(row.act.stage)"
                  >
                    <StageBadge :stage="row.act.stage" size="xs" />
                  </button>
                  <button
                    v-if="row.act.genre"
                    class="inline-flex items-center rounded-full border-2 border-black px-1.5 text-3xs font-bold whitespace-nowrap transition hover:brightness-95 cursor-pointer"
                    :class="genreColor(row.act.genre)"
                    title="Verberg dit genre uit de top-10"
                    @click.stop="toggleGenre(row.act.genre)"
                  >{{ row.act.genre }}</button>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="flex items-center justify-end gap-1 font-display text-lg font-black leading-none tabular-nums">
                  <HeartMarks :filled="1" size="size-4" />{{ row.hearts }}
                </div>
                <div class="mt-1.5 text-2xs font-bold text-black/40 tabular-nums">{{ row.groups }} groep{{ row.groups === 1 ? '' : 'en' }}</div>
              </div>
            </component>
          </TransitionGroup>

          <!-- extra acts (11–20): grid-rows 0fr→1fr animeert de hoogte naar auto -->
          <div
            v-if="extraActs.length"
            class="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300"
            :class="alleActs ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <TransitionGroup tag="ol" name="topper" class="relative divide-y-2 divide-black/10 border-t-2 border-black/10">
                <component
                  :is="groep ? 'button' : 'div'"
                  v-for="(row, i) in extraActs"
                  :key="row.act.id"
                  class="flex w-full items-start gap-3 px-4 py-2.5 text-left"
                  :class="groep ? 'cursor-pointer transition hover:bg-black/5 motion-safe:active:scale-[0.99]' : ''"
                  @click="groep && show(row.act)"
                >
                  <span class="w-5 shrink-0 self-center text-center font-display text-lg font-black tabular-nums text-black/40">{{ i + 11 }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-bold leading-none">{{ row.act.artist }}</div>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <HeartMarks
                        v-if="groepScore(row.act.scoreKey)"
                        :filled="groepScore(row.act.scoreKey)"
                        size="size-2.5"
                        :title="`Jullie hartjes: ${groepScore(row.act.scoreKey)}/3`"
                      />
                      <StageBadge :stage="row.act.stage" size="xs" />
                      <button
                        v-if="row.act.genre"
                        class="inline-flex items-center rounded-full border-2 border-black px-1.5 text-3xs font-bold whitespace-nowrap transition hover:brightness-95 cursor-pointer"
                        :class="genreColor(row.act.genre)"
                        title="Verberg dit genre uit de top-10"
                        @click.stop="toggleGenre(row.act.genre)"
                      >{{ row.act.genre }}</button>
                    </div>
                  </div>
                  <div class="shrink-0 text-right">
                    <div class="flex items-center justify-end gap-1 font-display text-lg font-black leading-none tabular-nums">
                      <HeartMarks :filled="1" size="size-4" />{{ row.hearts }}
                    </div>
                    <div class="mt-1.5 text-2xs font-bold text-black/40 tabular-nums">{{ row.groups }} groep{{ row.groups === 1 ? '' : 'en' }}</div>
                  </div>
                </component>
              </TransitionGroup>
            </div>
          </div>

          <button
            v-if="topActs.length > 10"
            type="button"
            class="flex w-full cursor-pointer items-center justify-center border-t-2 border-black/10 py-0.5 text-black transition-colors hover:bg-black/5"
            :aria-label="alleActs ? 'Toon minder acts' : `Toon alle ${topActs.length} acts`"
            :title="alleActs ? 'Toon minder' : `Toon alle ${topActs.length} acts`"
            @click="alleActs = !alleActs"
          >
            <UIcon
              name="i-lucide-chevron-down"
              class="size-6 motion-safe:transition-transform motion-safe:duration-300"
              :class="{ 'rotate-180': alleActs }"
            />
          </button>
        </section>

        <!-- Per podium: opgetelde hartjes, gemiddelde per act, aantal acts -->
        <section class="ww-card overflow-hidden">
          <div class="border-b-[3px] border-black bg-oker-200 px-4 py-2">
            <h2 class="font-display text-lg font-black">Podia</h2>
          </div>
          <ul class="divide-y-2 divide-black/10">
            <li
              v-for="row in eersteStages"
              :key="row.stage"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <StageBadge :stage="row.stage" size="sm" />
              <div class="flex-1" />
              <div class="flex items-center gap-4 text-right tabular-nums">
                <div>
                  <div class="flex items-center justify-end gap-1 font-display text-lg font-black leading-none">
                    <HeartMarks :filled="1" size="size-4" />{{ row.hearts }}
                  </div>
                  <div class="mt-1 text-2xs font-bold text-black/40">{{ row.acts }} acts</div>
                </div>
              </div>
            </li>
          </ul>

          <!-- extra podia: grid-rows 0fr→1fr animeert de hoogte naar auto -->
          <div
            v-if="extraStages.length"
            class="grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300"
            :class="alleStages ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
          >
            <div class="overflow-hidden">
              <ul class="divide-y-2 divide-black/10 border-t-2 border-black/10">
                <li
                  v-for="row in extraStages"
                  :key="row.stage"
                  class="flex items-center gap-3 px-4 py-2.5"
                >
                  <StageBadge :stage="row.stage" size="sm" />
                  <div class="flex-1" />
                  <div class="flex items-center gap-4 text-right tabular-nums">
                    <div>
                      <div class="flex items-center justify-end gap-1 font-display text-lg font-black leading-none">
                        <HeartMarks :filled="1" size="size-4" />{{ row.hearts }}
                      </div>
                      <div class="mt-1 text-2xs font-bold text-black/40">{{ row.acts }} acts</div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <button
            v-if="stages.length > 3"
            type="button"
            class="flex w-full cursor-pointer items-center justify-center border-t-2 border-black/10 py-0.5 text-black transition-colors hover:bg-black/5"
            :aria-label="alleStages ? 'Toon minder podia' : `Toon alle ${stages.length} podia`"
            :title="alleStages ? 'Toon minder' : `Toon alle ${stages.length} podia`"
            @click="alleStages = !alleStages"
          >
            <UIcon
              name="i-lucide-chevron-down"
              class="size-6 motion-safe:transition-transform motion-safe:duration-300"
              :class="{ 'rotate-180': alleStages }"
            />
          </button>
        </section>

        <!-- Per genre: gemiddeld aantal hartjes per geprogrammeerde act -->
        <section class="ww-card overflow-hidden">
          <div class="border-b-[3px] border-black bg-veld-200 px-4 py-2">
            <h2 class="font-display text-lg font-black">Genres</h2>
          </div>
          <ul class="divide-y-2 divide-black/10">
            <li v-for="row in genres" :key="row.genre" class="px-4 py-2.5">
              <div class="flex items-start gap-3">
                <span
                  class="inline-flex items-center rounded-full border-2 border-black px-2 py-0.5 text-xs font-bold whitespace-nowrap"
                  :class="genreColor(row.genre)"
                >{{ row.genre }}</span>
                <div class="flex-1" />
                <div class="text-right tabular-nums">
                  <div class="flex items-center justify-end gap-1 font-display text-lg font-black leading-none">
                    <HeartMarks :filled="1" size="size-4" />{{ row.avg.toFixed(2).replace('.', ',') }}
                  </div>
                  <div class="mt-1 flex items-center justify-end gap-0.5 text-2xs font-bold text-black/40">{{ row.hearts }} <HeartMarks :filled="1" inherit size="size-2.5" /> · {{ row.totalActs }} acts</div>
                </div>
              </div>
              <div class="mt-1.5 h-2 overflow-hidden rounded-full border-2 border-black bg-white">
                <div class="h-full" :class="genreColor(row.genre)" :style="{ width: pct(maxGenreAvg ? row.avg / maxGenreAvg : 0) }" />
              </div>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
/* Subtiele in/uit-animatie bij het filteren van genres: weggefilterde rijen
   faden weg en de rest schuift omhoog (move). Alleen met bewegingsvoorkeur; de
   leave-rij gaat absoluut uit de flow zodat de move-transitie kan lopen. */
@media (prefers-reduced-motion: no-preference) {
  .topper-move,
  .topper-enter-active,
  .topper-leave-active {
    transition: opacity 220ms ease, transform 220ms ease;
  }
  .topper-enter-from,
  .topper-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
  .topper-leave-active {
    position: absolute;
    width: 100%;
  }
}
</style>
