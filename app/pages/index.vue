<script setup lang="ts">
import { GROEPSWISSEL_QUERY } from '#shared/groep'

definePageMeta({ wwBg: 'lila' })

const route = useRoute()
const { rememberGroep, lastGroep } = useGroep()

const naam = ref('')
const bezig = ref(false)
const fout = ref('')

// pas na mount bekend: localStorage bestaat niet tijdens prerender
const laatste = ref<{ slug: string, naam: string } | null>(null)
onMounted(() => {
  const last = lastGroep()
  // verse load op / met een bekende groep → direct het schema in. Bewust ná
  // hydration (niet in de middleware): een redirect tijdens hydration laat het
  // max-w-xl-formulier-DOM op de groepspagina plakken. ?groepswissel (bewust
  // van groep wisselen) slaat de redirect over en toont het formulier.
  if (last && route.query[GROEPSWISSEL_QUERY] === undefined) {
    navigateTo(`/groep/${last.slug}`, { replace: true })
    return
  }
  laatste.value = last
})

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
    // bestaande groep → direct het schema in; nieuwe groep → eerst de
    // 'mijn groep'-pagina met de deelbare link
    await navigateTo(res.bestond ? `/groep/${res.slug}` : `/groep/${res.slug}/mijn-groep`)
  } catch (err) {
    const data = (err as { data?: { error?: string, statusMessage?: string } }).data
    fout.value = data?.error ?? data?.statusMessage ?? 'Er ging iets mis — probeer het nog eens.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4 pt-4">
    <div class="ww-card space-y-4 p-5">
      <h2 class="font-display text-3xl font-black leading-tight">Met wie ga jij?</h2>
      <p class="text-sm font-bold">
        Verzin een nieuwe groepsnaam of vul een bestaande in. De groepsnaam is je toegangskaartje dus verzin iets unieks!
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
  </div>
</template>
