<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui'
import { UButton } from '#components'
import StageBadge from '~/components/StageBadge.vue'
import HeartScore from '~/components/HeartScore.vue'
import StarMarks from '~/components/StarMarks.vue'
import { actTimeStatus, DAY_META, genreColor } from '~/data/display'
import type { Act, } from '~/types/program'
import type { VNode } from 'vue'

definePageMeta({ wwBg: 'oker' })

const filteredActs = useFilteredActs()
const { show } = useActDetails()
const now = useNow()

/** afgelopen acts: celinhoud gedempt (grijs + verzadiging eruit) */
function mute(act: Act, node: VNode | VNode[]) {
  return h('div', { class: actTimeStatus(act, now.value) === 'past' ? 'opacity-45 grayscale' : '' }, node)
}

function sortableHeader(label: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ column }: any) => h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: column.getIsSorted()
      ? (column.getIsSorted() === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : 'i-lucide-arrow-down-wide-narrow')
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5 font-bold text-black',
    onClick: () => column.toggleSorting(column.getIsSorted() === 'asc')
  })
}

function dayShort(act: Act): string {
  return DAY_META.find(d => d.key === act.dayKey)?.shortLabel ?? ''
}

const columns: TableColumn<Act>[] = [
  {
    id: 'tijd',
    accessorKey: 'start',
    header: sortableHeader('Tijd'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1.5' }, [
      actTimeStatus(row.original, now.value) === 'now'
        ? h('span', { class: 'rounded-full border-2 border-black bg-black px-1.5 text-3xs font-black text-white' }, 'NU')
        : null,
      mute(row.original, h('span', { class: 'font-mono text-xs font-bold whitespace-nowrap' }, `${dayShort(row.original)} ${row.original.time}`))
    ])
  },
  {
    accessorKey: 'artist',
    header: sortableHeader('Artiest'),
    cell: ({ row }) => mute(row.original, h('span', { class: 'font-bold' }, row.original.artist))
  },
  {
    accessorKey: 'stage',
    header: sortableHeader('Podium'),
    cell: ({ row }) => mute(row.original, h(StageBadge, { stage: row.original.stage, size: 'xs' }))
  },
  {
    accessorKey: 'genre',
    header: sortableHeader('Genre'),
    cell: ({ row }) => row.original.genre
      ? mute(row.original, h('span', {
          class: `inline-flex whitespace-nowrap rounded-full border-2 border-black px-1.5 text-3xs font-bold ${genreColor(row.original.genre)}`
        }, row.original.genre))
      : ''
  },
  {
    accessorKey: 'style',
    header: 'Stijl',
    cell: ({ row }) => mute(row.original, h('span', { class: 'text-sm' }, row.original.style ?? ''))
  },
  {
    id: 'score',
    // suggesties sorteren tussen 'geen score' en score 1 in
    accessorFn: act => act.score ?? (act.status === 'suggested' ? 0.5 : 0),
    header: sortableHeader('Score'),
    cell: ({ row }) => mute(row.original, h(HeartScore, { act: row.original }))
  },
  {
    accessorKey: 'liveRep',
    header: sortableHeader('Live'),
    cell: ({ row }) => mute(row.original, h(StarMarks, { count: row.original.liveRep ?? 0, size: 'size-3.5' }))
  }
]

const sorting = ref([{ id: 'tijd', desc: false }])

function onSelect(_e: Event, row: TableRow<Act>) {
  show(row.original)
}
</script>

<template>
  <div class="space-y-4">
    <ActFilterBar />

    <div class="ww-card overflow-hidden">
      <UTable
        v-model:sorting="sorting"
        :data="filteredActs"
        :columns="columns"
        class="cursor-pointer"
        @select="onSelect"
      />
    </div>

    <p class="text-sm font-bold">{{ filteredActs.length }} artiesten</p>
  </div>
</template>
