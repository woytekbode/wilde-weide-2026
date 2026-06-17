export default defineAppConfig({
  ui: {
    colors: {
      primary: 'lila',
      secondary: 'oker',
      success: 'veld',
      neutral: 'stone'
    },
    // inputs/selects in de chunky ww-stijl: dikke zwarte rand, zwarte tekst;
    // de outline-variant zelf overschrijven, want die wint anders van de slots
    input: {
      slots: {
        // group op de wrapper zodat het hele veld (incl. icoon) mee-inverteert
        root: 'group',
        // veld inverteert bij hover/focus naar zwart met witte tekst/placeholder
        base: 'rounded-full border-[3px] border-black font-bold transition-colors placeholder:text-black/50 group-hover:bg-black group-hover:text-white group-hover:placeholder:text-white/50 group-focus-within:bg-black group-focus-within:text-white group-focus-within:placeholder:text-white/50',
        leadingIcon: 'text-black transition-colors group-hover:text-white group-focus-within:text-white'
      },
      variants: {
        variant: {
          // ring-0 haalt de grijze default-ring weg. De witte focus-stroke staat
          // op de UInput zelf via :ui (zie ActFilterBar): de paarse stroke is een
          // compoundVariant-outline die hier vanuit de variant niet te overrulen is
          outline: 'text-black bg-white ring-0'
        }
      }
    },
    selectMenu: {
      slots: {
        // group zodat de chevron mee-inverteert; de hover-inversie zelf staat in
        // de variant hieronder (slot-classes verliezen het van de variant)
        base: 'group rounded-full border-[3px] border-black font-bold transition-colors',
        placeholder: 'text-black/50 group-hover:text-white/50',
        trailingIcon: 'text-black transition-colors group-hover:text-white',
        // z-50 tilt de lijst boven de tabel/acts (die staan met relative +
        // hover-scale een eigen stacking context op); rounded-lg ≈ 0.6rem×2 =
        // 19px, gelijk aan de halve knophoogte van de pill-trigger (Nuxt UI
        // schaalt de radius-tokens met --ui-radius, rounded-2xl was 38px en dus
        // veel ronder dan de knop); overflow-hidden (default) knipt de
        // hover-band netjes af op die afgeronde hoeken. max-h-none haalt de
        // 15rem-cap weg zodat de lijst volledig uitklapt zonder intern scrollen
        content: 'z-50 max-h-none rounded-lg border-[3px] border-black ring-0 bg-white',
        // groeppadding eraf zodat de hover-band de volle breedte vult tot aan
        // de afgeronde rand i.p.v. een ingesprongen pil per item
        group: 'p-0',
        // items als ww-btn: hover inverteert naar zwart/wit, geselecteerd
        // krijgt de paginakleur (vereist :portal="false", anders staat de
        // lijst buiten de layout-div waar --ww-accent op gezet wordt). De
        // achtergrond zit op ::before; inset-0 + rounded-none maakt er een
        // horizontale band van i.p.v. een losse pil per item
        item: 'font-bold text-black before:inset-0 before:rounded-none data-highlighted:not-data-disabled:text-white data-highlighted:not-data-disabled:before:bg-black data-[state=checked]:not-data-highlighted:before:bg-[var(--ww-accent,var(--color-lila-500))]',
        itemTrailing: 'hidden'
      },
      variants: {
        variant: {
          // trigger inverteert op hover (zwarte vulling, witte tekst); in de
          // variant zodat het de subtiele Nuxt UI-default-hover overschrijft.
          // focus-visible:ring-0 haalt de paarse ring bij openen weg
          outline: 'text-black bg-white ring-0 hover:bg-black hover:text-white focus-visible:ring-0'
        }
      }
    }
  }
})
