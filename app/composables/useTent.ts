/**
 * Gedeelde tentlocatie per groep. Iedereen in dezelfde groep ziet dezelfde
 * tent: de coördinaat (fractie 0..1 van de plattegrond) leeft in KV onder
 * tent:<slug> — in dev de Nitro-mock, live de worker. Zelfde optimistische
 * patroon als useScoring: de UI verandert direct, bij een fout rollen we terug.
 * Het laden gebeurt in plugins/groep.client.ts naast de scores.
 */
export interface TentPos {
  fx: number
  fy: number
}

export function useTent() {
  const { groep } = useGroep()
  const tent = useState<TentPos | null>('tent', () => null)

  async function setTent(fx: number, fy: number) {
    const previous = tent.value
    tent.value = { fx, fy }
    try {
      await $fetch(`/api/groep/${groep.value}/tent`, {
        method: 'POST',
        body: { fx, fy }
      })
    } catch (err) {
      tent.value = previous
      console.error('tent opslaan mislukt', err)
      useToast().add({ title: 'Tent opslaan mislukt', color: 'error' })
    }
  }

  async function clearTent() {
    const previous = tent.value
    tent.value = null
    try {
      await $fetch(`/api/groep/${groep.value}/tent`, {
        method: 'POST',
        body: { clear: true }
      })
    } catch (err) {
      tent.value = previous
      console.error('tent verwijderen mislukt', err)
      useToast().add({ title: 'Tent verwijderen mislukt', color: 'error' })
    }
  }

  return { tent, setTent, clearTent }
}
