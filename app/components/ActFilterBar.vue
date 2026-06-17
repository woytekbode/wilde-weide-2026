<script setup lang="ts">
import { actTimeStatus, DAY_META, SCORE_OPTIONS } from '~/data/display'

const { filters, reset } = useFilters()
const { festival, acts } = useActs()
const now = useNow()

// pas relevant zodra er daadwerkelijk iets afgelopen is (tijdens het weekend)
const anyPast = computed(() => now.value !== null && acts.value.some(a => actTimeStatus(a, now.value) === 'past'))
</script>

<template>
  <div class="ww-card space-y-3 p-3">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="filters.search"
        icon="i-lucide-search"
        placeholder="zoek artiest of stijl"
        class="w-full sm:w-56"
        :ui="{
          // De paarse focus-stroke is een compoundVariant-outline
          // (focus-visible:outline-3 outline-primary/25) die van de app.config-
          // slots/variant wint; daarom hier via :ui (wordt als laatste gemerged):
          // outline weg + witte inset-ring op het (zwart geïnverteerde) veld
          base: 'focus-visible:outline-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white!'
        }"
      />
      <USelectMenu
        v-model="filters.stages"
        :items="festival.stages"
        :search-input="false"
        :portal="false"
        multiple
        placeholder="alle stages"
        class="w-36"
      />
      <USelectMenu
        v-model="filters.genres"
        :items="festival.genres"
        :search-input="false"
        :portal="false"
        multiple
        placeholder="alle genres"
        class="w-40"
      />
      <USelectMenu
        v-model="filters.types"
        :items="festival.types"
        :search-input="false"
        :portal="false"
        multiple
        placeholder="alle types"
        class="w-36"
      />
      <button class="ww-btn py-0.5! text-sm" @click="reset()">wis filters</button>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-sm">
      <span class="font-bold">dag:</span>
      <button
        class="ww-btn py-0.5! text-sm"
        :class="{ 'ww-btn-active': filters.day === 'alle' }"
        @click="filters.day = 'alle'"
      >alle</button>
      <button
        v-for="day in DAY_META"
        :key="day.key"
        class="ww-btn py-0.5! text-sm"
        :class="{ 'ww-btn-active': filters.day === day.key }"
        @click="filters.day = day.key"
      >{{ day.shortLabel }}</button>

      <!-- score-label + chips in één groep zodat "score:" mee naar een nieuwe
           regel zakt i.p.v. los achter te blijven -->
      <div class="flex flex-wrap items-center gap-2">
        <!-- sm:ml-3 alleen als score op dezelfde regel als 'dag:' staat; bij
             wrappen op telefoon geen inspring zodat het uitlijnt met 'dag:' -->
        <span class="font-bold sm:ml-3">hartjes:</span>
        <button
          v-for="opt in SCORE_OPTIONS"
          :key="opt.value"
          class="ww-btn py-0.5! text-sm max-sm:px-2!"
          :class="{ 'ww-btn-active': filters.minScore === opt.value }"
          :title="opt.title"
          @click="filters.minScore = opt.value"
        >{{ opt.label }}</button>
      </div>

      <button
        v-if="anyPast"
        class="ww-btn py-0.5! ml-3 text-sm"
        :class="{ 'ww-btn-active': filters.hideFinished }"
        @click="filters.hideFinished = !filters.hideFinished"
      >verberg afgelopen</button>
    </div>
  </div>
</template>
