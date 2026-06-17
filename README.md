# Wilde Weide 2026 — ons schema

Statische webapp met ons eigen blokkenschema voor [Wilde Weide Festival](https://wildeweide.nl/) (3–5 juli 2026, Netl de Wildste Tuin, Kraggenburg). Gebouwd met Nuxt 4 + Nuxt UI, stijl losjes gebaseerd op de festivalsite.

## Views

- **/** — blokkenschema per dag (stages als kolommen), met conflictmarkering (`!`) tussen favorieten, suggestie-markering (`?`) en een uitklapbare conflictlijst
- **/tabel** — sorteerbare tabel met filters (dag, stage, genre, type, score)
- **/acts** — actsoverzicht met dezelfde filters
- **/stages** — per dag en per stage in één zin de globale sfeer (uit [app/data/wildeweide-stages.json](app/data/wildeweide-stages.json))

## Ontwikkelen

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # statische build naar .output/public
npm run typecheck
```

## Scoren met hartjes

Hartjes zijn overal klikbaar (hover over de hartjes op acts/tabel, of open de detail-popup — op je telefoon gaat scoren via de popup). Klikken op je huidige score zet hem terug naar **0** = beoordeeld, niet voor ons (suggestie wegwerken: 1 hartje klikken en nogmaals klikken). Persistentie verschilt per omgeving:

- **Live site**: een klik bewaart een override in Cloudflare KV (namespace `wilde_weide_likes`, via [worker/index.ts](worker/index.ts) op `/api/scores`). Iedereen ziet elkaars scores na een refresh. **KV wint altijd van de JSON** op de site.
- **Dev** (`npm run dev`): een klik schrijft direct in de programma-JSON (`/api/score`); `git diff` → commit + push.

Live scores terughalen naar de repo: `npm run pull-scores` merget de KV-overrides in de JSON (daarna zelf committen). Let op de KV-wint-regel: een score die je daarna in de JSON aanpast blijft op de site overschaduwd door de KV-entry; corrigeer via de site zelf of verwijder de override met `POST /api/scores {"id": "...", "score": null}`.

Let op: de dev-server herlaadt dit JSON-bestand bewust niet (zie `vite.server.watch.ignored` in `nuxt.config.ts`), anders zou elke klik een page-reload geven. Bewerk je de JSON handmatig terwijl de dev-server draait, herstart die dan even.

## Tijdens het festival

De views zijn tijdbewust (klok tikt per minuut, client-side):

- afgelopen acts vervagen (blokken/acts) of worden grijs gedempt (tabel), en zijn met **verberg afgelopen** in de filterbalk te verbergen
- acts die nu spelen krijgen een zwarte **NU**-chip; het blokkenschema toont een **nu-lijn** op de huidige tijd en scrollt daarheen
- de festivaldag van vandaag wordt automatisch voorgeselecteerd (nachten tot 06:00 horen bij de vorige dag)

Testen/previewen buiten het weekend kan met een query-parameter, ook op de live site: `/?fakenow=2026-07-04T18:30:00`.

## Data

Alle data staat in [app/data/wildeweide-programma.json](app/data/wildeweide-programma.json) en wordt build-time geïmporteerd. Structuur: `{ "festival": { name, dates, location, stages[], types[], genres[], legend }, "days": [{ day, date, acts: [...] }] }`, per act:

```json
{
  "time": "12:00-14:00",
  "start": "2026-07-03T12:00:00",
  "end": "2026-07-03T14:00:00",
  "stage": "Bamboebos",
  "artist": "…",
  "host": null,
  "type": "DJ set",
  "genre": "electronic & dance",
  "style": "tribal house",
  "score": null,
  "status": "unscored",
  "liveRep": 1,
  "liveImpression": "…",
  "description": "…",
  "country": "NL",
  "curator": null,
  "spotify": null
}
```

- `type` en `genre` zijn vaste filter-buckets uit `festival.types` / `festival.genres`; `style` is de precieze typering
- `score`: 1–3 (hartjes, 3 = echt zien), `null` = geen score; `status`: `scored` / `suggested` (nog te scoren) / `unscored`
- `liveRep`: live-reputatie 1–3 (✦), alleen extra context
- `host`: gevuld als de act onderdeel is van een hosting-blok; `curator`: naam, of letterlijk `"curator"` als de act zelf curator is
- acts ná middernacht horen bij de festivaldag waaronder ze genest staan (de ISO-datum loopt dan een dag voor)

Badge-kleuren per genre/stage staan in [app/data/display.ts](app/data/display.ts).

## Deployen (Cloudflare Workers Builds)

De repo is gekoppeld aan Cloudflare via **Workers & Pages → Connect to Git**. [wrangler.jsonc](wrangler.jsonc) wijst naar de statische output; de build-instellingen in het dashboard:

- **Build command**: `npm run generate`
- **Deploy command**: `npx wrangler deploy`

Eigen subdomein: Worker → **Settings → Domains & Routes → Add → Custom domain**.

Elke push naar `main` deployt automatisch.
