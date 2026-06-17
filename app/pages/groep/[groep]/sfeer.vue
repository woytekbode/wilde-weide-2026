<script setup lang="ts">
import sfeer from '~/data/wildeweide-sfeermakers.json'

definePageMeta({ wwBg: 'veld' })

const { sorted, toggleLike } = useSfeer()
</script>

<template>
  <div class="space-y-4">
    <!-- intro -->
    <section class="ww-card p-4">
      <p class="text-sm font-bold">{{ sfeer.intro }}</p>
    </section>

    <TransitionGroup
      tag="div"
      name="sfeer"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <button
        v-for="item in sorted"
        :key="item.id"
        class="ww-card relative flex cursor-pointer flex-col p-3.5 text-left transition-transform hover:scale-[1.02]"
        :class="item.liked ? '' : 'shadow-none!'"
        @click="toggleLike(item)"
      >
        <span
          v-if="item.liked"
          class="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full border-2 border-black bg-white text-xs text-red-600"
        >♥</span>
        <div class="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span
            class="rounded-full border-2 border-black px-1.5 text-[10px]"
            :class="item.type === 'Hosting' ? 'bg-sky-300' : 'bg-veld-300'"
          >
            {{ item.type }}
          </span>
        </div>
        <h3 class="font-display text-xl font-black leading-tight">{{ item.name }}</h3>
        <p class="mt-2 text-sm">{{ item.description }}</p>
      </button>
    </TransitionGroup>

    <p class="text-sm font-bold">{{ sorted.length }} sfeermakers</p>
  </div>
</template>

<style scoped>
/* FLIP-animatie van TransitionGroup bij het hersorteren na een like;
   !important zodat de korte transition-transform van de knop niet wint */
.sfeer-move {
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1) !important;
}
</style>
