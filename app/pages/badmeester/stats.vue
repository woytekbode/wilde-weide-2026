<script setup lang="ts">
import type { AdminGroepenResponse, AdminLikesResponse, LikeAggregateMap } from '#shared/groep'
import { buildActs } from '~/composables/useActs'
import { genreColor } from '~/data/display'
import type { Act } from '~/types/program'

definePageMeta({ layout: 'admin' })

const { token, hydrate, adminFetch } = useAdmin()

const totaal = ref({ groepen: 0, likes: 0, active: 0 })
const likes = ref<LikeAggregateMap>({})
const bezig = ref(true)
const fout = ref('')
const alleStages = ref(false)

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
    const [groepen, likesRes] = await Promise.all([
      adminFetch<AdminGroepenResponse>('/api/admin/groepen'),
      adminFetch<AdminLikesResponse>('/api/admin/likes')
    ])
    totaal.value = groepen.totaal
    likes.value = likesRes.likes
  } catch (err) {
    if (token.value) fout.value = 'Laden mislukt — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}

onMounted(async () => {
  hydrate()
  if (token.value) await laad()
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

/** top 10 acts; primair op gewogen hartjes, dan op aantal groepen */
const topActs = computed(() =>
  [...joined.value].sort((a, b) => b.hearts - a.hearts || b.groups - a.groups).slice(0, 10)
)

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

const zichtbareStages = computed(() => alleStages.value ? stages.value : stages.value.slice(0, 3))

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
          <div class="font-display flex items-center justify-center gap-1.5 text-4xl font-black tabular-nums">
            <UIcon name="i-lucide-heart" class="size-7" />{{ totaal.likes }}
          </div>
          <div class="text-sm font-bold">hartjes</div>
        </div>
      </div>

      <p v-if="leeg" class="ww-card p-5 text-sm font-bold text-black/60">
        Nog geen hartjes uitgedeeld.
      </p>

      <template v-else>
        <!-- Top 10 acts: gewogen hartjes (1/2/3) opgeteld over alle groepen -->
        <section class="ww-card overflow-hidden">
          <h2 class="border-b-2 border-black/10 px-4 py-3 font-display text-xl font-black">Populairste acts</h2>
          <ol class="divide-y-2 divide-black/10">
            <li
              v-for="(row, i) in topActs"
              :key="row.act.id"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <span class="w-5 shrink-0 text-center font-display text-lg font-black tabular-nums text-black/40">{{ i + 1 }}</span>
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold">{{ row.act.artist }}</div>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <StageBadge :stage="row.act.stage" size="xs" />
                  <span
                    v-if="row.act.genre"
                    class="inline-flex items-center rounded-full border-2 border-black px-1.5 text-[10px] font-bold whitespace-nowrap"
                    :class="genreColor(row.act.genre)"
                  >{{ row.act.genre }}</span>
                  <span class="text-[11px] font-bold text-black/40">{{ row.act.dayKey }}</span>
                </div>
              </div>
              <div class="shrink-0 text-right">
                <div class="flex items-center justify-end gap-1 font-display text-lg font-black tabular-nums">
                  <UIcon name="i-lucide-heart" class="size-4" />{{ row.hearts }}
                </div>
                <div class="text-[11px] font-bold text-black/40 tabular-nums">{{ row.groups }} groep{{ row.groups === 1 ? '' : 'en' }}</div>
              </div>
            </li>
          </ol>
        </section>

        <!-- Per podium: opgetelde hartjes, gemiddelde per act, aantal acts -->
        <section class="ww-card overflow-hidden">
          <h2 class="border-b-2 border-black/10 px-4 py-3 font-display text-xl font-black">Per podium</h2>
          <ul class="divide-y-2 divide-black/10">
            <li
              v-for="row in zichtbareStages"
              :key="row.stage"
              class="flex items-center gap-3 px-4 py-2.5"
            >
              <StageBadge :stage="row.stage" size="sm" />
              <div class="flex-1" />
              <div class="flex items-center gap-4 text-right tabular-nums">
                <div>
                  <div class="flex items-center justify-end gap-1 font-display text-lg font-black">
                    <UIcon name="i-lucide-heart" class="size-4" />{{ row.hearts }}
                  </div>
                  <div class="text-[11px] font-bold text-black/40">⌀ {{ row.avg.toFixed(1) }} · {{ row.acts }} acts</div>
                </div>
              </div>
            </li>
          </ul>
          <button
            v-if="stages.length > 3"
            class="w-full border-t-2 border-black/10 py-2 text-xs font-bold text-black/60 transition hover:bg-black/5"
            @click="alleStages = !alleStages"
          >
            {{ alleStages ? 'Toon minder' : `Toon alle ${stages.length} podia` }}
          </button>
        </section>

        <!-- Per genre: gemiddeld aantal hartjes per geprogrammeerde act -->
        <section class="ww-card overflow-hidden">
          <div class="border-b-2 border-black/10 px-4 py-3">
            <h2 class="font-display text-xl font-black">Per genre</h2>
            <p class="text-[11px] font-bold text-black/40">gemiddeld hartjes per geprogrammeerde act</p>
          </div>
          <ul class="divide-y-2 divide-black/10">
            <li v-for="row in genres" :key="row.genre" class="px-4 py-2.5">
              <div class="flex items-center gap-3">
                <span
                  class="inline-flex items-center rounded-full border-2 border-black px-2 py-0.5 text-xs font-bold whitespace-nowrap"
                  :class="genreColor(row.genre)"
                >{{ row.genre }}</span>
                <div class="flex-1" />
                <div class="text-right tabular-nums">
                  <div class="flex items-center justify-end gap-1 font-display text-lg font-black">
                    <UIcon name="i-lucide-heart" class="size-4" />{{ row.avg.toFixed(2) }}
                  </div>
                  <div class="text-[11px] font-bold text-black/40">over {{ row.totalActs }} acts · {{ row.hearts }} totaal</div>
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
