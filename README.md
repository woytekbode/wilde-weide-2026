# Wilde Weide 2026 Vriendenplek

> Met wie ga jij?

Een eigen festivalplanner voor [Wilde Weide Festival](https://wildeweide.nl/) (3.4.5 juli 2026, Netl de Wildste Tuin, Kraggenburg). Je verzint een **groepsnaam**, deelt de link met je vrienden (of vage kennissen), en samen scoren jullie het programma met **hartjes** — iedereen ziet elkaars keuzes. Gebouwd met Nuxt 4 + Nuxt UI, stijl losjes gepikt van de festivalsite.

## Hoe werkt het?

1. Open de site, vul bij **"Met wie ga jij?"** een nieuwe groepsnaam in — of een bestaande, dan sluit je je daarbij aan.
2. Deel de link (`/groep/<naam>`) met je crew.
3. Klik je favorieten vol hartjes. Alles wat jullie doen wordt gedeeld binnen de groep.

Geen account, geen wachtwoord. De groepsnaam ís de sleutel.

## Wat zit erin?

De onderbalk (mobiel) en de nav bovenin (desktop) brengen je naar:

- **Programma** — het blokkenschema per dag, podia als kolommen. Markeert een **Conflict** (`!`) als twee favorieten tegelijk spelen, een **Tip** (`?`) voor suggesties, en een zwarte **NU**-chip + nu-lijn voor wat er op dit moment speelt. Tik op een podiumnaam om dat **podium te verbergen**.
- **Ontdekken** — alle acts als kaartjes met genre, stijl en hartjes; hoe meer hartjes, hoe dikker de schaduw. Een toggle in de filterbalk schakelt tussen **muziek** (per optreden) en de **sfeermakers** (hosting & acts die de boel maken — één kaart per activiteit, ook al keert die meermaals terug).
- **Podia** — per dag en per podium in één zin wat voor sfeer je daar kunt verwachten.
- **Kaart** — de **plattegrond**: knijp om te zoomen, tik om je **tent** te plaatsen. De tentlocatie is gedeeld, zodat de hele groep weet waar jullie kamperen.

Er is ook een (verstopte) **Tabel** op `/groep/<naam>/tabel`: dezelfde acts, sorteerbaar en filterbaar. Oude links naar `/artiesten` en `/sfeer` sturen automatisch door naar **Ontdekken**.

### Scoren met hartjes

Hartjes zijn overal klikbaar (op de kaartjes, in de tabel, of via de detail-popup — op je telefoon gaat het via de popup):

- **♥ / ♥♥ / ♥♥♥** — leuk tot "deze MOET je zien".
- Klik op je huidige score om hem terug op **0** te zetten: beoordeeld, maar niet voor ons.
- **Tip** (`?`) is een suggestie die nog geen hartjes heeft — kan je zelf niet kiezen, laat de groep beslissen.
- **Reputatie** (✦✦✦) is wat Claude over een act zegt; puur extra context, het zegt niks over jullie voorkeur.

### Tijdens het festival

De views zijn tijdbewust (de klok tikt client-side per minuut):

- afgelopen acts vervagen of worden grijs, en zijn met **verberg afgelopen** in de filterbalk weg te toveren;
- de festivaldag van vandaag staat automatisch voorgeselecteerd (nachten tot 06:00 horen bij de vorige dag);
- en kun je niet wachten? **Tijdreizen** (het klok-knopje) springt naar een willekeurig moment in het weekend en bevriest de klok — doe alsof je er al bent, zet een liedje op, doe een dansje.

Previewen buiten het weekend kan ook met een query-parameter: `/?fakenow=2026-07-04T18:30:00`.

## Ontwikkelen

```bash
npm install
npm run dev        # http://localhost:3000
npm run generate   # statische build naar .output/public
npm run typecheck
```

In dev draait de groeps-API gewoon mee via Nitro (`/api/groep/...`), met een lokale KV in `.data/kv`. Heb je een KV-backup (`server/data/kv-backup.json`), dan seedt die de dev-KV met realistische groepsdata — anders start je met een lege KV en verzin je zelf een groep. Een snapshot van de live data trek je met `npm run backup-kv` (gitignored, niet committen — bevat privé group-slugs).

## Achter de schermen

De statische site staat op Cloudflare; daarnaast draait een **Worker** ([worker/index.ts](worker/index.ts)) met de groeps-API op **Workers KV**. Per groep liggen er losse blobs:

- `groepen` — het register van groepsnamen
- `scores:<slug>` — de hartjes-scores
- `sfeer:<slug>` — de sfeermaker-likes
- `tent:<slug>` — de gedeelde tentlocatie

Read-modify-write per blob is last-write-wins; voor een vriendengroep prima. Er is een **Badmeester**-paneel op `/badmeester` (token-gated) om groepen te bekijken en op te ruimen.

## Data

Alle programma-data staat in [app/data/wildeweide-programma.json](app/data/wildeweide-programma.json) en wordt build-time geïmporteerd. Structuur: `{ "festival": { name, dates, location, stages[], types[], genres[], legend }, "days": [{ day, date, acts: [...] }] }`, per act:

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
- `score`: 1–3 (hartjes, 3 = echt zien), `null` = geen score; `status`: `scored` / `suggested` (Tip) / `unscored`
- `liveRep`: live-reputatie 1–3 (✦), alleen extra context
- acts ná middernacht horen bij de festivaldag waaronder ze genest staan (de ISO-datum loopt dan een dag voor)

De sfeermakers staan in [app/data/wildeweide-sfeermakers.json](app/data/wildeweide-sfeermakers.json), de podium-sfeer in [app/data/wildeweide-stages.json](app/data/wildeweide-stages.json), en de badge-kleuren per genre/podium in [app/data/display.ts](app/data/display.ts).

## Deployen (Cloudflare Workers Builds)

De repo is gekoppeld aan Cloudflare via **Workers & Pages → Connect to Git**. [wrangler.jsonc](wrangler.jsonc) wijst naar de statische output; de build-instellingen in het dashboard:

- **Build command**: `npm run generate`
- **Deploy command**: `npx wrangler deploy`

Eigen subdomein: Worker → **Settings → Domains & Routes → Add → Custom domain**. Elke push naar `main` deployt automatisch.
