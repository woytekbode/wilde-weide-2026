<script setup lang="ts">
definePageMeta({ wwBg: 'oker' })

// Pinch-to-zoom dat alleen de plattegrond-kaart schaalt (niet de pagina).
// Twee vingers = zoomen rond het midden van de knijp; één vinger = slepen
// zolang ingezoomd; een schone tik plaatst (of verplaatst) de tent.
const card = ref<HTMLElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const MIN = 1
const MAX = 4
const TAP_SLOP = 10 // px beweging waaronder een touch nog als 'tik' telt

// Tent-marker: gedeeld per groep (KV via useTent), opgeslagen als fractie
// (0..1) van de afbeelding, zodat hij onafhankelijk van zoom/formaat op
// dezelfde plek blijft, mee schaalt én voor iedereen in de groep gelijk is.
const { tent, setTent, clearTent } = useTent()

// Zolang we op fit (scale 1) staan mag de pagina verticaal scrollen met één
// vinger; ingezoomd nemen we alle touch-gestures zelf over (slepen/knijpen).
const touchAction = computed(() => (scale.value > MIN ? 'none' : 'pan-y'))

const transform = computed(
  () => `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`
)

let lastDist = 0
let lastMid = { x: 0, y: 0 }
let lastSingle = { x: 0, y: 0 }
let tapStart = { x: 0, y: 0 }
let tapTime = 0
let moved = false
let pinched = false
let dragging = false
let mouseMoved = false

function rect() {
  return card.value!.getBoundingClientRect()
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

// Houd de afbeelding binnen de kaart (origin staat linksboven, zie template).
function clamp() {
  const r = rect()
  tx.value = Math.min(0, Math.max(r.width * (1 - scale.value), tx.value))
  ty.value = Math.min(0, Math.max(r.height * (1 - scale.value), ty.value))
}

function midpoint(t0: Touch, t1: Touch) {
  const r = rect()
  return {
    x: (t0.clientX + t1.clientX) / 2 - r.left,
    y: (t0.clientY + t1.clientY) / 2 - r.top
  }
}

function dist(t0: Touch, t1: Touch) {
  return Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    pinched = true
    lastDist = dist(e.touches[0]!, e.touches[1]!)
    lastMid = midpoint(e.touches[0]!, e.touches[1]!)
  } else if (e.touches.length === 1) {
    const t = e.touches[0]!
    lastSingle = { x: t.clientX, y: t.clientY }
    tapStart = { x: t.clientX, y: t.clientY }
    tapTime = Date.now()
    moved = false
    pinched = false
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 2) {
    e.preventDefault()
    const d = dist(e.touches[0]!, e.touches[1]!)
    const mid = midpoint(e.touches[0]!, e.touches[1]!)
    const next = Math.min(MAX, Math.max(MIN, (scale.value * d) / lastDist))
    const factor = next / scale.value

    // mee-pannen met het verschuivende midden ...
    tx.value += mid.x - lastMid.x
    ty.value += mid.y - lastMid.y
    // ... en inzoomen rond dat midden
    tx.value = mid.x - (mid.x - tx.value) * factor
    ty.value = mid.y - (mid.y - ty.value) * factor

    scale.value = next
    lastDist = d
    lastMid = mid
    clamp()
  } else if (e.touches.length === 1) {
    const t = e.touches[0]!
    if (Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) > TAP_SLOP) {
      moved = true
    }
    if (scale.value > MIN) {
      e.preventDefault()
      tx.value += t.clientX - lastSingle.x
      ty.value += t.clientY - lastSingle.y
      lastSingle = { x: t.clientX, y: t.clientY }
      clamp()
    }
  }
}

// Bij het optillen van een vinger verandert het aantal touches. Her-ijk de
// referentiepunten naar de vinger(s) die blijven, anders berekent de eerstvolgende
// beweging een delta t.o.v. een verouderd punt en springt de afbeelding.
function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 1) {
    lastSingle = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
    return
  }
  if (e.touches.length === 2) {
    lastDist = dist(e.touches[0]!, e.touches[1]!)
    lastMid = midpoint(e.touches[0]!, e.touches[1]!)
    return
  }
  // alle vingers los: was dit een schone tik (geen sleep/knijp)? plaats de tent
  if (!moved && !pinched && Date.now() - tapTime < 700) {
    placeTent(tapStart.x, tapStart.y)
  }
}

// --- Muis (desktop): scroll = zoom, slepen = pannen, klik = tent plaatsen ---
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const r = rect()
  const cx = e.clientX - r.left
  const cy = e.clientY - r.top
  const next = Math.min(MAX, Math.max(MIN, scale.value * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
  const factor = next / scale.value
  tx.value = cx - (cx - tx.value) * factor
  ty.value = cy - (cy - ty.value) * factor
  scale.value = next
  clamp()
}

function onMouseDown(e: MouseEvent) {
  dragging = true
  mouseMoved = false
  tapStart = { x: e.clientX, y: e.clientY }
  lastSingle = { x: e.clientX, y: e.clientY }
}

function onMouseMove(e: MouseEvent) {
  if (!dragging) return
  if (Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > TAP_SLOP) {
    mouseMoved = true
  }
  if (scale.value > MIN) {
    tx.value += e.clientX - lastSingle.x
    ty.value += e.clientY - lastSingle.y
    lastSingle = { x: e.clientX, y: e.clientY }
    clamp()
  }
}

function onMouseUp(e: MouseEvent) {
  if (!dragging) return
  dragging = false
  if (!mouseMoved) placeTent(e.clientX, e.clientY)
}

// Reken schermcoördinaten terug naar een fractie van de afbeelding (inverse
// van translate+scale, origin linksboven) en zet daar de tent neer.
function placeTent(clientX: number, clientY: number) {
  const r = rect()
  const px = (clientX - r.left - tx.value) / scale.value
  const py = (clientY - r.top - ty.value) / scale.value
  setTent(clamp01(px / r.width), clamp01(py / r.height))
}
</script>

<template>
  <div class="space-y-6">
    <!-- plattegrond: knijp met twee vingers om te zoomen, tik om je tent te plaatsen -->
    <section
      ref="card"
      class="ww-card relative cursor-tent overflow-hidden active:cursor-grabbing"
      :style="{ touchAction }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="dragging = false"
    >
      <!-- wrapper draagt de transform, zodat afbeelding én tent samen mee zoomen/pannen -->
      <div class="relative origin-top-left" :style="{ transform }">
        <img
          src="/wildeweide-plattegrond.jpg"
          alt="Plattegrond Wilde Weide 2026 — Netl de Wildste Tuin"
          class="block w-full select-none"
          draggable="false"
          loading="lazy"
        >
        <!-- marker als SVG met breedte in % van de kaart, zodat de verhouding
             marker:kaart op elk schermformaat gelijk blijft (clamp houdt 'm op
             een klein scherm leesbaar). Schaalt daarnaast mee met de zoom omdat
             hij in de getransformeerde wrapper zit. -->
        <div
          v-if="tent"
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          :style="{ left: `${tent.fx * 100}%`, top: `${tent.fy * 100}%`, width: 'clamp(16px, 4%, 50px)' }"
        >
          <svg viewBox="0 0 32 32" class="block w-full drop-shadow-sm">
            <circle cx="16" cy="16" r="14" fill="#a48dbe" stroke="#000" stroke-width="2" />
            <g transform="translate(5.2 5.2) scale(0.9)" fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3.5 21 14 3" />
              <path d="M20.5 21 10 3" />
              <path d="M15.5 21 12 15l-3.5 6" />
              <path d="M2 21h20" />
            </g>
          </svg>
        </div>
      </div>

      <!-- dock rechtsboven (buiten de transform): de 'thuisbasis' van de tent.
           Niet geplaatst = gevuld tent-dock; geplaatst = leeg stippel-dock met X,
           tik erop om de tent terug naar het dock te halen. -->
      <div
        class="absolute right-3 top-3 z-10 cursor-default"
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
      >
        <div
          v-if="!tent"
          class="flex size-12 items-center justify-center rounded-full border-[3px] border-black bg-lila-500 shadow-md"
        >
          <UIcon name="i-lucide-tent" class="size-7 text-black" />
        </div>
        <button
          v-else
          type="button"
          class="flex size-12 cursor-pointer items-center justify-center rounded-full border-[3px] border-dotted border-black/50 bg-white/60 shadow-md"
          aria-label="Tent terughalen"
          @click="clearTent()"
        >
          <UIcon name="i-lucide-x" class="size-6 text-black" />
        </button>
      </div>

      <!-- hint zolang er nog geen tent staat -->
      <p
        v-if="!tent"
        class="pointer-events-none absolute inset-x-0 bottom-3 z-10 mx-auto w-fit rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-bold shadow-md"
      >
        Tik op de kaart om je tent te plaatsen
      </p>
    </section>
  </div>
</template>
