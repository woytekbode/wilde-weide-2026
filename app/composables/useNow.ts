/**
 * Gedeelde klok (epoch ms), elke minuut bijgewerkt door app/plugins/now.ts.
 * null = nog niet gezet (statische render / vóór hydration) → views tonen
 * dan de neutrale toekomst-stijl.
 */
export function useNow() {
  return useState<number | null>('now-ms', () => null)
}
