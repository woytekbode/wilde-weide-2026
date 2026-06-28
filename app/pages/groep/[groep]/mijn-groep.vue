<script setup lang="ts">
import { GROEPSWISSEL_QUERY } from '#shared/groep'

definePageMeta({ wwBg: 'lila' })

const { groep, groepNaam } = useGroep()

const kiesGroepLink = `/?${GROEPSWISSEL_QUERY}`

const deelLink = ref('')
onMounted(() => {
  deelLink.value = `${location.origin}/groep/${groep.value}`
})

const gekopieerd = ref(false)
async function kopieerLink() {
  try {
    await navigator.clipboard.writeText(deelLink.value)
    gekopieerd.value = true
  } catch {
    useToast().add({ title: 'Kopiëren mislukt — kopieer de link handmatig', color: 'error' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 pt-4">
    <div class="ww-card space-y-4 p-5">
      <h2 class="font-display text-3xl font-black leading-tight">🌿 {{ groepNaam || groep }} 🌿</h2>
      <p class="text-sm font-bold">
        Deel deze link met je vrienden, of vage kennissen.
      </p>
      <div class="ww-card-flat bg-stone-50 p-3 text-sm font-bold break-all">{{ deelLink }}</div>
      <div class="flex flex-col gap-2 sm:flex-row">
        <button
          class="relative flex-1"
          :class="gekopieerd ? 'ww-btn' : 'ww-btn-solid'"
          @click="kopieerLink"
        >
          {{ gekopieerd ? 'Link gekopieerd' : 'Kopieer link' }}
          <span
            class="absolute right-1 top-1/2 flex size-7 shrink-0 -translate-y-1/2 items-center justify-center rounded-full"
            :class="gekopieerd ? 'bg-black text-white' : 'ww-btn-circle'"
          >
            <UIcon :name="gekopieerd ? 'i-lucide-check' : 'i-lucide-link'" class="size-4" />
          </span>
        </button>
        <NuxtLink :to="`/groep/${groep}`" class="ww-btn-solid relative flex-1 text-center">
          Naar mijn groep
          <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </NuxtLink>
      </div>
      <NuxtLink :to="kiesGroepLink" class="ww-btn relative block w-full text-center">
        Wissel van groep
        <span class="ww-btn-circle-outline absolute right-1 top-1/2 -translate-y-1/2">
          <UIcon name="i-lucide-users" class="size-4" />
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
