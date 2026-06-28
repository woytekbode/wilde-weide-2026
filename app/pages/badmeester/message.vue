<script setup lang="ts">
import type { BroadcastMessage, MessageAction, MessageTarget } from '#shared/message'
import { MESSAGE_ACTION_LABEL, MESSAGE_SHARE_TEXT_DEFAULT } from '#shared/message'

definePageMeta({ layout: 'admin' })

const { token, hydrate, adminFetch } = useAdmin()
const toast = useToast()

const targetOpties: { value: MessageTarget, label: string }[] = [
  { value: 'all', label: 'Alle hoofdpagina\'s' },
  { value: 'programma', label: 'Programma' },
  { value: 'ontdekken', label: 'Ontdekken' },
  { value: 'toppers', label: 'Toppers' },
  { value: 'podia', label: 'Podia' },
  { value: 'kaart', label: 'Kaart' }
]
const actieOpties: { value: '' | MessageAction, label: string }[] = [
  { value: '', label: 'Geen knop' },
  { value: 'share', label: 'Deel je groep' },
  { value: 'shareApp', label: 'Deel de app' },
  { value: 'external', label: 'Open link' },
  { value: 'copy', label: 'Kopieer link' }
]

const form = reactive({
  title: '',
  body: '',
  target: 'all' as MessageTarget,
  action: '' as '' | MessageAction,
  link: '',
  linkLabel: '',
  shareText: '',
  expiresLocal: ''
})

const huidig = ref<BroadcastMessage | null>(null)
const bezig = ref(false)

const heeftLink = computed(() => form.action === 'external' || form.action === 'copy')
const heeftDeelTekst = computed(() => form.action === 'share' || form.action === 'shareApp')
const knopVoorbeeld = computed(() => form.action ? (form.linkLabel || MESSAGE_ACTION_LABEL[form.action]) : '')
const deelTekstDefault = computed(() => (form.action === 'share' || form.action === 'shareApp') ? MESSAGE_SHARE_TEXT_DEFAULT[form.action] : '')
const deelTekstVoorbeeld = computed(() => form.shareText || deelTekstDefault.value)

// wat er in het link-kader van het voorbeeld staat (share = per bezoeker)
const voorbeeldUrl = computed(() => {
  if (form.action === 'copy') return form.link || 'https://...'
  if (form.action === 'share') return 'De eigen groepslink van de bezoeker'
  if (form.action === 'shareApp') return 'De basis-URL van de app'
  return ''
})

/** ms → 'YYYY-MM-DDTHH:mm' in lokale tijd, voor <input type="datetime-local"> */
function naarLokaal(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function vulFormulier(m: BroadcastMessage | null) {
  if (!m) return
  form.title = m.title
  form.body = m.body
  form.target = m.target
  form.action = m.action ?? ''
  form.link = m.link ?? ''
  form.linkLabel = m.linkLabel ?? ''
  form.shareText = m.shareText ?? ''
  form.expiresLocal = m.expiresAt ? naarLokaal(m.expiresAt) : ''
}

async function laad() {
  try {
    huidig.value = await $fetch<BroadcastMessage | null>('/api/message')
    vulFormulier(huidig.value)
  } catch { /* nog geen bericht */ }
}

onMounted(async () => {
  hydrate()
  if (token.value) await laad()
})

function foutTekst(e: unknown): string {
  return (e as { data?: { error?: string, statusMessage?: string } })?.data?.error
    || (e as { data?: { statusMessage?: string } })?.data?.statusMessage
    || 'Er ging iets mis'
}

async function verstuur(resend: boolean) {
  bezig.value = true
  try {
    const body: Record<string, unknown> = {
      title: form.title,
      body: form.body,
      target: form.target,
      resend
    }
    if (form.action) {
      body.action = form.action
      if (heeftLink.value) body.link = form.link
      if (form.linkLabel) body.linkLabel = form.linkLabel
      if (heeftDeelTekst.value && form.shareText) body.shareText = form.shareText
    }
    if (form.expiresLocal) body.expiresAt = new Date(form.expiresLocal).getTime()

    huidig.value = await adminFetch<BroadcastMessage>('/api/admin/message', { method: 'POST', body })
    toast.add({ title: resend ? 'Bericht verstuurd naar iedereen' : 'Bericht bijgewerkt', color: 'success' })
  } catch (e) {
    toast.add({ title: foutTekst(e), color: 'error' })
  } finally {
    bezig.value = false
  }
}

async function verwijder() {
  bezig.value = true
  try {
    await adminFetch('/api/admin/message', { method: 'DELETE' })
    huidig.value = null
    form.title = ''
    form.body = ''
    form.target = 'all'
    form.action = ''
    form.link = ''
    form.linkLabel = ''
    form.shareText = ''
    form.expiresLocal = ''
    toast.add({ title: 'Bericht verwijderd', color: 'success' })
  } catch (e) {
    toast.add({ title: foutTekst(e), color: 'error' })
  } finally {
    bezig.value = false
  }
}

const inputClass = 'w-full rounded-xl border-2 border-black bg-white px-3 py-2 font-bold placeholder:font-normal'
</script>

<template>
  <div v-if="token" class="mx-auto max-w-xl space-y-4 pt-4">
    <!-- huidige status -->
    <div class="ww-card space-y-1 p-5">
      <h2 class="font-display text-3xl font-black leading-tight">Bericht</h2>
      <p v-if="huidig" class="text-sm font-bold">
        Actief op <span class="underline">{{ targetOpties.find(o => o.value === huidig!.target)?.label }}</span>{{ huidig.expiresAt ? `, tonen tot ${new Date(huidig.expiresAt).toLocaleString('nl-NL')}` : '' }}.
      </p>
      <p v-else class="text-sm font-bold">Er staat nu geen bericht klaar.</p>
    </div>

    <!-- formulier -->
    <form class="ww-card space-y-4 p-5" @submit.prevent="verstuur(true)">
      <label class="block space-y-1">
        <span class="text-sm font-bold">Titel</span>
        <input v-model="form.title" :class="inputClass" maxlength="80" placeholder="Bijv. Line-up gewijzigd">
      </label>

      <label class="block space-y-1">
        <span class="text-sm font-bold">Bericht</span>
        <textarea v-model="form.body" :class="inputClass" rows="4" maxlength="1000" placeholder="Wat wil je laten weten?" />
      </label>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label class="block space-y-1">
          <span class="text-sm font-bold">Tonen op</span>
          <select v-model="form.target" :class="inputClass">
            <option v-for="o in targetOpties" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-bold">Knop</span>
          <select v-model="form.action" :class="inputClass">
            <option v-for="o in actieOpties" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
      </div>

      <label v-if="heeftLink" class="block space-y-1">
        <span class="text-sm font-bold">Link</span>
        <input v-model="form.link" :class="inputClass" maxlength="500" placeholder="https://...">
      </label>

      <label v-if="heeftDeelTekst" class="block space-y-1">
        <span class="text-sm font-bold">Deel-tekst <span class="font-normal text-black/50">(optioneel)</span></span>
        <input v-model="form.shareText" :class="inputClass" maxlength="200" :placeholder="deelTekstDefault">
        <span class="block text-2xs text-black/50">Gaat als tekstregel mee naar bijv. WhatsApp, gevolgd door de link.</span>
      </label>

      <label v-if="form.action" class="block space-y-1">
        <span class="text-sm font-bold">Knoptekst <span class="font-normal text-black/50">(optioneel)</span></span>
        <input v-model="form.linkLabel" :class="inputClass" maxlength="40" :placeholder="MESSAGE_ACTION_LABEL[form.action]">
      </label>

      <label class="block space-y-1">
        <span class="text-sm font-bold">Tonen tot <span class="font-normal text-black/50">(optioneel)</span></span>
        <input v-model="form.expiresLocal" type="datetime-local" :class="inputClass">
      </label>

      <!-- voorbeeld zoals gebruikers het zien -->
      <div v-if="form.title || form.body" class="space-y-2">
        <p class="text-2xs font-bold uppercase tracking-wide text-black/40">Voorbeeld</p>
        <div class="ww-card-flat space-y-3 bg-white p-4">
          <h3 class="font-display text-2xl font-black leading-tight">{{ form.title || 'Titel' }}</h3>
          <p class="text-sm whitespace-pre-line">{{ form.body }}</p>

          <!-- open externe link -->
          <div v-if="form.action === 'external'" class="ww-btn-solid pointer-events-none relative w-full text-center">
            {{ knopVoorbeeld }}
            <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-external-link" class="size-4" />
            </span>
          </div>

          <!-- delen of kopiëren: link in een kader + knop -->
          <template v-else-if="form.action === 'share' || form.action === 'shareApp' || form.action === 'copy'">
            <div class="ww-card-flat bg-stone-50 p-3 text-sm font-bold break-all">{{ voorbeeldUrl }}</div>
            <div class="ww-btn-solid pointer-events-none relative w-full text-center">
              {{ knopVoorbeeld }}
              <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
                <UIcon :name="form.action === 'copy' ? 'i-lucide-link' : 'i-lucide-share-2'" class="size-4" />
              </span>
            </div>
            <p v-if="heeftDeelTekst" class="text-2xs text-black/50">Deelt: "{{ deelTekstVoorbeeld }}" + de link</p>
          </template>
        </div>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <button type="submit" :disabled="bezig" class="ww-btn-solid flex-1 disabled:opacity-50">
          Versturen naar iedereen
        </button>
        <button type="button" :disabled="bezig || !huidig" class="ww-btn flex-1 disabled:opacity-50" @click="verstuur(false)">
          Stil bijwerken
        </button>
      </div>
      <button v-if="huidig" type="button" :disabled="bezig" class="ww-btn w-full text-red-600 disabled:opacity-50" @click="verwijder">
        Bericht verwijderen
      </button>
    </form>
  </div>
</template>
