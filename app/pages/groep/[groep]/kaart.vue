<script setup lang="ts">
definePageMeta({ wwBg: 'lila', wwFullscreen: true })

// De plattegrond is verreweg de zwaarste asset van de pagina; laat de browser hem
// meteen (al tijdens het laden van de HTML) ophalen i.p.v. pas nadat de component
// hydrateert, zodat de kaart op mobiel sneller in zijn standstand verschijnt.
useHead({
  link: [{ rel: 'preload', as: 'image', href: '/wildeweide-plattegrond.webp', type: 'image/webp', fetchpriority: 'high' }]
})

// Pinch-to-zoom + vrij verslepen van alléén de plattegrond (niet de pagina). Eén
// systeem voor mobiel én desktop: de kaart leeft in een 'viewport' (schermvullend
// en edge-to-edge onder de header, op elk formaat). Op een staand scherm (telefoon) opent
// hij beeldvullend en kun je uitknijpen tot de héle kaart past (beeldbreedte =
// schermbreedte); op een breed venster (desktop) opent hij meteen op de hele kaart,
// gecentreerd. Slepen mag in elke richting; bij loslaten veert de kaart terug naar
// de dichtstbijzijnde legale stand. Een schone tik plaatst de tent (gedeeld per
// groep via useTent).
const card = ref<HTMLElement | null>(null)
const image = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

// Zoomgrenzen (reactief): MIN = 'contain' — de schaal waarbij de héle kaart past
// (≤1, dus beeldbreedte = vensterbreedte). MAX = 4× de openingsstand. startScale is
// de openingsstand: beeldvullend op een staand scherm, anders meteen 'contain'.
const MIN = ref(1)
const MAX = ref(4)
let startScale = 1
const TAP_SLOP = 10 // px beweging waaronder een touch nog als 'tik' telt
const imgAspect = ref(2331 / 3108) // echte plattegrond (0.75), fallback tot de afbeelding geladen is

const { tent, setTent } = useTent()

// Zonder geplaatste tent staat de marker midden op de kaart, klaar om te verplaatsen.
const tentPos = computed(() => tent.value ?? { fx: 0.5, fy: 0.5 })

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
let raf = 0

function rect() {
  return card.value!.getBoundingClientRect()
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

// Basis(on-geschaalde) beeldhoogte: de echte gerenderde hoogte van de <img> (die op
// w-full staat), met de aspect-ratio als fallback voordat de afbeelding geladen is.
function baseImgHeight() {
  return image.value?.offsetHeight || rect().width / imgAspect.value
}

// Herbereken de zoomgrenzen + openingsstand voor het huidige venster-/beeldformaat.
function recompute() {
  const r = rect()
  const fillHeight = r.height / baseImgHeight() // schaal die de vensterhoogte vult
  MIN.value = Math.min(1, fillHeight)           // contain: hele kaart past (breedte = vensterbreedte)
  // Staand venster (telefoon, volscherm) opent beeldvullend; een breed venster (desktop) op de hele kaart.
  startScale = r.width < r.height ? fillHeight : MIN.value
  MAX.value = startScale * 4                     // tot 4× de openingsstand inzoomen
}

// Legale positiegrenzen bij schaal s. In een richting waar het beeld gróter is dan
// het venster mag het schuiven (binnen beeld blijven); is het kléiner, dan klemmen
// we het gecentreerd (geen schuiven in de letterbox).
function bounds(s: number) {
  const r = rect()
  const sx = r.width - r.width * s          // >0 ⇒ beeld smaller dan venster
  const sy = r.height - baseImgHeight() * s // >0 ⇒ beeld lager dan venster
  return {
    txLo: sx < 0 ? sx : sx / 2, txHi: sx < 0 ? 0 : sx / 2,
    tyLo: sy < 0 ? sy : sy / 2, tyHi: sy < 0 ? 0 : sy / 2
  }
}

// Direct naar een geldige stand klemmen (zonder animatie) — voor zoom en resize.
function clampNow() {
  scale.value = Math.min(MAX.value, Math.max(MIN.value, scale.value))
  const b = bounds(scale.value)
  tx.value = Math.min(b.txHi, Math.max(b.txLo, tx.value))
  ty.value = Math.min(b.tyHi, Math.max(b.tyLo, ty.value))
}

// Soepel naar de dichtstbijzijnde legale stand veren (na een sleep/knijp loslaten).
function animateTo(ts: number, ttx: number, tty: number) {
  cancelAnimationFrame(raf)
  const s0 = scale.value
  const x0 = tx.value
  const y0 = ty.value
  const t0 = performance.now()
  const dur = 220
  const ease = (p: number) => 1 - Math.pow(1 - p, 3) // easeOutCubic
  function step(now: number) {
    const p = Math.min(1, (now - t0) / dur)
    const e = ease(p)
    scale.value = s0 + (ts - s0) * e
    tx.value = x0 + (ttx - x0) * e
    ty.value = y0 + (tty - y0) * e
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

function settle() {
  const ts = Math.min(MAX.value, Math.max(MIN.value, scale.value))
  const b = bounds(ts)
  animateTo(ts, Math.min(b.txHi, Math.max(b.txLo, tx.value)), Math.min(b.tyHi, Math.max(b.tyLo, ty.value)))
}

// Openingsstand: beeldvullend (staand scherm) of de hele kaart (breed venster). De
// kaart wordt zo ver mogelijk naar links gelegd: is er horizontale speling (telefoon,
// beeld breder dan het scherm) dan valt de linkerrand van de kaart samen met de
// linkerrand van het scherm; is er geen speling (desktop, paarse rand opzij) dan staat
// hij gecentreerd. Verticaal gecentreerd (op een telefoon vult hij precies de hoogte).
function fit() {
  recompute()
  const r = rect()
  scale.value = startScale
  tx.value = bounds(scale.value).txHi
  ty.value = (r.height - baseImgHeight() * scale.value) / 2
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
  cancelAnimationFrame(raf) // een lopende terugveer-animatie onderbreken
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
    const next = Math.min(MAX.value, Math.max(MIN.value, (scale.value * d) / lastDist))
    const factor = next / scale.value

    // mee-pannen met het verschuivende midden ...
    tx.value += mid.x - lastMid.x
    ty.value += mid.y - lastMid.y
    // ... en inzoomen rond dat midden (positie vrij; terugveren gebeurt bij loslaten)
    tx.value = mid.x - (mid.x - tx.value) * factor
    ty.value = mid.y - (mid.y - ty.value) * factor

    scale.value = next
    lastDist = d
    lastMid = mid
  } else if (e.touches.length === 1) {
    const t = e.touches[0]!
    if (Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) > TAP_SLOP) {
      moved = true
    }
    // vrij verslepen in elke richting (overscroll mag; veert terug bij loslaten)
    e.preventDefault()
    tx.value += t.clientX - lastSingle.x
    ty.value += t.clientY - lastSingle.y
    lastSingle = { x: t.clientX, y: t.clientY }
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
  // alle vingers los: schone tik plaatst de tent, anders terugveren naar legale stand
  if (!moved && !pinched && Date.now() - tapTime < 700) placeTent(tapStart.x, tapStart.y)
  else settle()
}

// --- Muis (desktop): scroll = zoom, slepen = pannen, klik = tent plaatsen ---
function onWheel(e: WheelEvent) {
  e.preventDefault()
  cancelAnimationFrame(raf)
  const r = rect()
  const cx = e.clientX - r.left
  const cy = e.clientY - r.top
  const next = Math.min(MAX.value, Math.max(MIN.value, scale.value * (e.deltaY < 0 ? 1.1 : 1 / 1.1)))
  const factor = next / scale.value
  tx.value = cx - (cx - tx.value) * factor
  ty.value = cy - (cy - ty.value) * factor
  scale.value = next
  clampNow()
}

function onMouseDown(e: MouseEvent) {
  cancelAnimationFrame(raf)
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
  tx.value += e.clientX - lastSingle.x
  ty.value += e.clientY - lastSingle.y
  lastSingle = { x: e.clientX, y: e.clientY }
}

function onMouseUp(e: MouseEvent) {
  if (!dragging) return
  dragging = false
  if (mouseMoved) settle()
  else placeTent(e.clientX, e.clientY)
}

function onMouseLeave() {
  if (!dragging) return
  dragging = false
  if (mouseMoved) settle()
}

// Reken schermcoördinaten terug naar een fractie van de afbeelding (inverse van
// translate+scale, origin linksboven) en zet daar de tent neer.
function placeTent(clientX: number, clientY: number) {
  const r = rect()
  const px = (clientX - r.left - tx.value) / scale.value
  const py = (clientY - r.top - ty.value) / scale.value
  setTent(clamp01(px / r.width), clamp01(py / baseImgHeight()))
}

// Echte aspect uit de geladen afbeelding overnemen en de kaart opnieuw schermvullend zetten.
function onImgLoad() {
  const img = image.value
  if (img?.naturalWidth && img.naturalHeight) imgAspect.value = img.naturalWidth / img.naturalHeight
  fit()
}

let ro: ResizeObserver | undefined
onMounted(() => {
  fit()
  ro = new ResizeObserver(() => {
    recompute()
    clampNow()
  })
  if (card.value) ro.observe(card.value)
})
onScopeDispose(() => {
  ro?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div class="h-full">
    <!-- plattegrond: knijp/scroll om te zoomen, sleep om te verschuiven, tik om je
         tent te plaatsen. Eén venster voor mobiel én desktop: schermvullend en
         edge-to-edge onder de header, zonder kaart/rand — de paginakleur loopt door
         in de paarse rand van de afbeelding. -->
    <section
      ref="card"
      class="relative h-full w-full cursor-tent touch-none overflow-hidden active:cursor-grabbing"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @wheel="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
    >
      <!-- wrapper draagt de transform, zodat afbeelding én tent samen mee zoomen/pannen -->
      <div class="relative origin-top-left" :style="{ transform }">
        <img
          ref="image"
          src="/wildeweide-plattegrond.webp"
          alt="Plattegrond Wilde Weide 2026 — Netl de Wildste Tuin"
          class="block w-full select-none"
          draggable="false"
          fetchpriority="high"
          decoding="async"
          @load="onImgLoad"
        >
        <!-- marker als SVG met breedte in % van de kaart, zodat de verhouding
             marker:kaart op elk schermformaat gelijk blijft (clamp houdt 'm op
             een klein scherm leesbaar). Schaalt mee met de zoom omdat hij in de
             getransformeerde wrapper zit. -->
        <div
          class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-opacity"
          :class="tent ? '' : 'opacity-60'"
          :style="{ left: `${tentPos.fx * 100}%`, top: `${tentPos.fy * 100}%`, width: 'clamp(16px, 5%, 50px)' }"
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
    </section>
  </div>
</template>
