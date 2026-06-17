import sfeerData from '~/data/wildeweide-sfeermakers.json'
import { slugify } from './useActs'

export interface SfeerItem {
  id: string
  name: string
  type: string
  description: string
  liked: boolean
}

/** neutrale sfeermakers uit de statische JSON; likes komen per groep uit KV */
export function buildSfeerItems(): SfeerItem[] {
  return sfeerData.items.map(i => ({
    ...i,
    id: slugify(i.name),
    liked: false
  }))
}

/**
 * Sfeermaker-likes. Zelfde patroon als useScoring: klik werkt direct door in
 * de UI; persistentie per groep via /api/groep/<slug>/sfeer — in dev de
 * Nitro-mock, live de worker, met dezelfde URL en blob-vorm.
 */
export function useSfeer() {
  const items = useState<SfeerItem[]>('sfeer', buildSfeerItems)
  const { groep } = useGroep()

  /** gelikete tegels bovenaan, daarbinnen de volgorde van het bronbestand */
  const sorted = computed(() => [...items.value].sort((a, b) => Number(b.liked) - Number(a.liked)))

  async function toggleLike(item: SfeerItem) {
    item.liked = !item.liked
    try {
      await $fetch(`/api/groep/${groep.value}/sfeer`, {
        method: 'POST',
        body: { id: item.id, liked: item.liked }
      })
    } catch (err) {
      item.liked = !item.liked
      console.error('like opslaan mislukt', err)
      useToast().add({ title: 'Like opslaan mislukt', color: 'error' })
    }
  }

  return { items, sorted, toggleLike }
}
