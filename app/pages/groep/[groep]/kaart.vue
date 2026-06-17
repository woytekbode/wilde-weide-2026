<script setup lang="ts">
definePageMeta({ wwBg: 'lila' })

// Pinch-to-zoom dat alleen de plattegrond-kaart schaalt (niet de pagina).
// Twee vingers = zoomen rond het midden van de knijp; één vinger = slepen
// zolang ingezoomd; dubbeltik = terug naar passend formaat.
const card = ref<HTMLElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const MIN = 1
const MAX = 4

// Zolang we op fit (scale 1) staan mag de pagina verticaal scrollen met één
// vinger; ingezoomd nemen we alle touch-gestures zelf over (slepen/knijpen).
const touchAction = computed(() => (scale.value > MIN ? 'none' : 'pan-y'))

const transform = computed(
  () => `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`
)

let lastDist = 0
let lastMid = { x: 0, y: 0 }
let lastSingle = { x: 0, y: 0 }
let lastTap = 0

function rect() {
  return card.value!.getBoundingClientRect()
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
    lastDist = dist(e.touches[0]!, e.touches[1]!)
    lastMid = midpoint(e.touches[0]!, e.touches[1]!)
  } else if (e.touches.length === 1) {
    lastSingle = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
    // dubbeltik-detectie
    const now = Date.now()
    if (now - lastTap < 300) {
      reset()
      lastTap = 0
    } else {
      lastTap = now
    }
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
  } else if (e.touches.length === 1 && scale.value > MIN) {
    e.preventDefault()
    const t = e.touches[0]!
    tx.value += t.clientX - lastSingle.x
    ty.value += t.clientY - lastSingle.y
    lastSingle = { x: t.clientX, y: t.clientY }
    clamp()
  }
}

// Bij het optillen van een vinger verandert het aantal touches. Her-ijk de
// referentiepunten naar de vinger(s) die blijven, anders berekent de eerstvolgende
// beweging een delta t.o.v. een verouderd punt en springt de afbeelding.
function onTouchEnd(e: TouchEvent) {
  if (e.touches.length === 1) {
    lastSingle = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
  } else if (e.touches.length === 2) {
    lastDist = dist(e.touches[0]!, e.touches[1]!)
    lastMid = midpoint(e.touches[0]!, e.touches[1]!)
  }
}

function reset() {
  scale.value = MIN
  tx.value = 0
  ty.value = 0
}
</script>

<template>
  <div class="space-y-6">
    <!-- plattegrond: knijp met twee vingers om te zoomen, dubbeltik om te resetten -->
    <section
      ref="card"
      class="ww-card overflow-hidden"
      :style="{ touchAction }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    >
      <img
        src="/wildeweide-plattegrond.jpg"
        alt="Plattegrond Wilde Weide 2026 — Netl de Wildste Tuin"
        class="block w-full origin-top-left select-none"
        :style="{ transform }"
        draggable="false"
        loading="lazy"
      >
    </section>
  </div>
</template>
