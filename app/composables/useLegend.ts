const LEGEND_SEEN_LS_KEY = 'ww-legend-seen'

/**
 * Eén gedeelde legenda-slideover (in de layout). Verschijnt eenmalig — bij de
 * eerste groep die iemand op dit apparaat opent — en is daarna te heropenen via
 * de ?-knop in de header. Zelfde one-time-localStorage-truc als de stagehint in
 * useTimetableFilters (fail open: bij onleesbare storage geen nudge meer).
 */
export function useLegend() {
  const open = useState<boolean>('legend-open', () => false)

  function legendPending(): boolean {
    try {
      return localStorage.getItem(LEGEND_SEEN_LS_KEY) !== '1'
    } catch {
      return false
    }
  }

  function markLegendSeen() {
    try {
      localStorage.setItem(LEGEND_SEEN_LS_KEY, '1')
    } catch { /* niet erg: legenda kan dan nog eens opduiken */ }
  }

  /** openen (auto én handmatig): markeer meteen als gezien, dus écht eenmalig */
  function openLegend() {
    markLegendSeen()
    open.value = true
  }

  function closeLegend() {
    open.value = false
  }

  return { open, legendPending, openLegend, closeLegend }
}
