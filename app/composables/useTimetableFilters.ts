import type { Programme } from '~/types/program'

/**
 * Filterstatus van het blokkenschema: de score-drempel dimt tegels (i.p.v.
 * verbergen zoals op acts/tabel) en stages zijn per device te verbergen.
 *
 * Per programma (muziek/sfeermakers) een eigen state + localStorage-sleutel,
 * zodat de twee blokkenschema's onafhankelijk filteren en stages verbergen.
 */
export function useTimetableFilters(programme: Programme = 'muziek') {
  const HIDDEN_STAGES_LS_KEY = `timetable-hidden-stages-${programme}`
  const HINT_DONE_LS_KEY = `timetable-stage-hint-done-${programme}`

  const minScore = useState<number>(`timetable-minscore-${programme}`, () => 0)
  const hiddenStages = useState<string[]>(`timetable-hidden-stages-${programme}`, () => [])

  /**
   * Herstelt de verborgen stages uit localStorage. Aanroepen vanuit onMounted
   * van TimetableGrid zelf: pas dan is het grid gegarandeerd gehydrateerd en is
   * de wijziging een gewone re-render. Eerder (bv. vanuit de filterbalk, die
   * vóór het grid mount) duwt de state-wijziging de grid-hydration over de
   * score-load van groep.client.ts heen → hydration-mismatches.
   */
  function restoreHiddenStages() {
    if (restored.value) return
    restored.value = true
    try {
      const stored = JSON.parse(localStorage.getItem(HIDDEN_STAGES_LS_KEY) ?? '[]')
      if (Array.isArray(stored) && stored.length > 0) hiddenStages.value = stored
    } catch { /* onleesbaar → alle stages zichtbaar */ }
    // wie al stages verborgen heeft, kent de truc → geen wiggle-hint meer
    if (hiddenStages.value.length > 0) markStageHintDone()
  }
  const restored = useState<boolean>(`timetable-hidden-stages-restored-${programme}`, () => false)

  /**
   * Eenmalige onboarding-hint (wiggle-wave op de stagechips): blijft pending tot
   * de gebruiker voor het eerst een stage verbergt. Defaultt naar "klaar" als
   * localStorage onleesbaar is, zodat we nooit blijven nudgen.
   */
  function stageHintPending(): boolean {
    try {
      return localStorage.getItem(HINT_DONE_LS_KEY) !== '1'
    } catch {
      return false
    }
  }
  function markStageHintDone() {
    try {
      localStorage.setItem(HINT_DONE_LS_KEY, '1')
    } catch { /* niet erg: hint speelt dan nog eens */ }
  }

  /**
   * Verbergt/toont een stage binnen een view transition: de stagechip heeft in
   * kolomkop en filterbalk dezelfde view-transition-name en "vliegt" dus tussen
   * beide plekken, terwijl de tegels (elk met een eigen naam) dichtschuiven.
   */
  function toggleStage(stage: string) {
    const apply = () => {
      hiddenStages.value = hiddenStages.value.includes(stage)
        ? hiddenStages.value.filter(s => s !== stage)
        : [...hiddenStages.value, stage]
      localStorage.setItem(HIDDEN_STAGES_LS_KEY, JSON.stringify(hiddenStages.value))
      markStageHintDone()
    }
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply()
      return
    }
    document.startViewTransition(async () => {
      apply()
      await nextTick()
    })
  }

  return { minScore, hiddenStages, toggleStage, restoreHiddenStages, stageHintPending, markStageHintDone }
}
