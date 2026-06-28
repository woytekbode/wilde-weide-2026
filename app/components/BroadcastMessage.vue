<script setup lang="ts">
import { MESSAGE_ACTION_LABEL, MESSAGE_PAGE_ROUTE, MESSAGE_SHARE_TEXT_DEFAULT, isExpired } from '#shared/message'

const route = useRoute()
const { groep } = useGroep()
const { open: legendOpen } = useLegend()
const { message, open, fetchMessage, seenId, markSeen } = useBroadcast()

// Verschijnt het bericht op deze pagina? 'all' = elke hoofd-navigatiepagina.
const targetMatches = computed(() => {
  const m = message.value
  if (!m) return false
  if (m.target === 'all') return Object.values(MESSAGE_PAGE_ROUTE).includes(route.name as string)
  return route.name === MESSAGE_PAGE_ROUTE[m.target]
})

const actionLabel = computed(() => {
  const m = message.value
  if (!m?.action) return ''
  return m.linkLabel || MESSAGE_ACTION_LABEL[m.action]
})

// De te delen/kopiëren link, getoond in een kader zoals de deel-link op
// mijn-groep, en gebruikt door de actieknop. Client-only: leest location, dat
// bij prerender niet bestaat. 'share' = eigen groep, 'shareApp' = basis-URL.
const weergaveUrl = computed(() => {
  if (!import.meta.client) return ''
  const m = message.value
  if (m?.action === 'share') return groep.value ? `${location.origin}/groep/${groep.value}` : location.origin
  if (m?.action === 'shareApp') return location.origin
  if (m?.action === 'copy') return m.link ?? ''
  return ''
})

// Eénmalig automatisch tonen: ongezien, niet verlopen, juiste pagina, en niet
// terwijl de legenda-slideover open is (geen twee gestapelde bottom-sheets). Per
// sessie onthouden welk id we al openden, zodat sluiten niet meteen heropent.
const openedId = ref('')
function maybeOpen() {
  const m = message.value
  if (!m || isExpired(m)) return
  if (legendOpen.value) return
  if (!targetMatches.value) return
  if (m.id === seenId()) return
  if (m.id === openedId.value) return
  openedId.value = m.id
  open.value = true
}
watch([message, () => route.name, legendOpen], maybeOpen)

// Bij sluiten (✕, backdrop, escape of na een actie): markeer als gezien, zodat
// het bericht niet terugkomt bij de volgende navigatie/refetch.
watch(open, (isOpen, was) => {
  if (was && !isOpen && message.value) markSeen(message.value.id)
})

// Ophalen bij laden én wanneer de app weer zichtbaar wordt (telefoon erbij
// pakken): zo bereikt een vers bericht ook wie de app al open had staan.
function onVisible() {
  if (document.visibilityState === 'visible') fetchMessage()
}
onMounted(async () => {
  await fetchMessage()
  maybeOpen()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

// Zelfde scroll-lock als de act-slideover en de legenda.
if (import.meta.client) {
  watch(open, (isOpen) => {
    document.documentElement.classList.toggle('modal-open', isOpen)
  })
  onScopeDispose(() => document.documentElement.classList.remove('modal-open'))
}

// Actieknop. 'share' deelt de eigen groepslink (vrienden belanden in dezelfde
// groep), 'shareApp' de basis-URL (de app in het algemeen); beide vallen terug
// op kopiëren waar navigator.share ontbreekt.
const gekopieerd = ref(false)
let kopieerTimer: ReturnType<typeof setTimeout> | undefined

async function kopieer(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    gekopieerd.value = true
    clearTimeout(kopieerTimer)
    kopieerTimer = setTimeout(() => (gekopieerd.value = false), 1500)
  } catch {
    useToast().add({ title: 'Kopiëren mislukt — kopieer de link handmatig', color: 'error' })
  }
}

async function doeActie() {
  const m = message.value
  if (!m?.action) return
  const url = weergaveUrl.value
  if (m.action === 'share' || m.action === 'shareApp') {
    // tekstregel (bijv. naar WhatsApp) + de link; valt terug op kopiëren van
    // tekst + link waar navigator.share ontbreekt
    const text = m.shareText || MESSAGE_SHARE_TEXT_DEFAULT[m.action]
    if (navigator.share) {
      try {
        await navigator.share({ text, url })
      } catch { /* geannuleerd: niks doen */ }
    } else {
      await kopieer(`${text} ${url}`)
    }
  } else if (m.action === 'copy') {
    await kopieer(url)
  }
}
</script>

<template>
  <USlideover v-model:open="open" side="bottom">
    <template #content>
      <div class="max-h-[90vh] overflow-y-auto border-t-[3px] border-black bg-white p-5 pb-10">
        <div v-if="message" class="mx-auto max-w-2xl space-y-4">
          <div class="flex items-start justify-between gap-3">
            <h2 class="font-display text-3xl font-black leading-tight">{{ message.title }}</h2>
            <button class="ww-nav-btn size-9 shrink-0 justify-center px-0!" aria-label="Sluiten" @click="open = false">✕</button>
          </div>

          <p class="text-sm whitespace-pre-line">{{ message.body }}</p>

          <!-- open externe link -->
          <a
            v-if="message.action === 'external' && message.link"
            :href="message.link"
            target="_blank"
            rel="noopener"
            class="ww-btn-solid relative block w-full text-center"
            @click="open = false"
          >
            {{ actionLabel }}
            <span class="ww-btn-circle absolute right-1 top-1/2 -translate-y-1/2">
              <UIcon name="i-lucide-external-link" class="size-4" />
            </span>
          </a>

          <!-- delen of kopiëren: link in een kader (zoals mijn-groep) + knop -->
          <template v-else-if="message.action === 'share' || message.action === 'shareApp' || message.action === 'copy'">
            <div class="ww-card-flat bg-stone-50 p-3 text-sm font-bold break-all">{{ weergaveUrl }}</div>
            <button
              class="relative w-full"
              :class="gekopieerd ? 'ww-btn' : 'ww-btn-solid'"
              @click="doeActie"
            >
              {{ gekopieerd ? 'Link gekopieerd' : actionLabel }}
              <span
                class="absolute right-1 top-1/2 flex size-7 shrink-0 -translate-y-1/2 items-center justify-center rounded-full"
                :class="gekopieerd ? 'bg-black text-white' : 'ww-btn-circle'"
              >
                <UIcon :name="gekopieerd ? 'i-lucide-check' : (message.action === 'copy' ? 'i-lucide-link' : 'i-lucide-share-2')" class="size-4" />
              </span>
            </button>
          </template>
        </div>
      </div>
    </template>
  </USlideover>
</template>
