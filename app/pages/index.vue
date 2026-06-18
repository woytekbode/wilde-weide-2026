<script setup lang="ts">
definePageMeta({ wwBg: 'lila' })

const { rememberGroep, lastGroep } = useGroep()

const naam = ref('')
const bezig = ref(false)
const fout = ref('')
const gemaakt = ref<{ slug: string, naam: string } | null>(null)

// pas na mount bekend: localStorage bestaat niet tijdens prerender
const laatste = ref<{ slug: string, naam: string } | null>(null)
onMounted(() => {
  laatste.value = lastGroep()
})

const deelLink = computed(() => gemaakt.value ? `${location.origin}/groep/${gemaakt.value.slug}` : '')
const gekopieerd = ref(false)

async function verstuur() {
  const ingevuld = naam.value.trim()
  if (ingevuld.length < 2) {
    fout.value = 'Vul minstens 2 tekens in.'
    return
  }
  bezig.value = true
  fout.value = ''
  try {
    const res = await $fetch<{ slug: string, naam: string, bestond: boolean }>('/api/groep', {
      method: 'POST',
      body: { naam: ingevuld }
    })
    rememberGroep(res.slug, res.naam)
    if (res.bestond) {
      await navigateTo(`/groep/${res.slug}`)
    } else {
      gemaakt.value = res
    }
  } catch (err) {
    const data = (err as { data?: { error?: string, statusMessage?: string } }).data
    fout.value = data?.error ?? data?.statusMessage ?? 'Er ging iets mis — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}

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
    <div v-if="!gemaakt" class="ww-card space-y-4 p-5">
      <h2 class="font-display text-3xl font-black leading-tight">Met wie ga jij?</h2>
      <p class="text-sm font-bold">
        Verzin een nieuwe groepsnaam of vul een bestaande in.
      </p>
      <form class="space-y-3" @submit.prevent="verstuur">
        <input
          v-model="naam"
          type="text"
          maxlength="40"
          placeholder="Groepsnaam"
          class="w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-bold placeholder:font-normal"
        >
        <p v-if="fout" class="text-sm font-bold text-red-600">{{ fout }}</p>
        <button type="submit" class="ww-btn-solid relative w-full" :disabled="bezig">
          {{ bezig ? 'Even geduld…' : 'Naar mijn groep' }}
          <span v-if="!bezig" class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </button>
      </form>
      <NuxtLink
        v-if="laatste"
        :to="`/groep/${laatste.slug}`"
        class="block text-center text-sm font-bold underline decoration-2 underline-offset-2"
      >
        Ik hoor al bij {{ laatste.naam }}...
      </NuxtLink>
    </div>

    <div v-else class="ww-card space-y-4 p-5">
      <h2 class="font-display text-3xl font-black leading-tight">{{ gemaakt.naam }}, wat een naam! 🐼</h2>
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
        <NuxtLink :to="`/groep/${gemaakt.slug}`" class="ww-btn-solid relative flex-1 text-center">
          Naar mijn groep
          <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
