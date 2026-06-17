import type { Act } from '~/types/program'

/** Eén gedeelde detail-slideover (in de layout), te openen vanuit elke view */
export function useActDetails() {
  const act = useState<Act | null>('act-details', () => null)
  const open = useState<boolean>('act-details-open', () => false)

  function show(a: Act) {
    act.value = a
    open.value = true
  }

  return { act, open, show }
}
