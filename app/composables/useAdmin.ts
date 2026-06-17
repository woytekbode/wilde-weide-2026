const ADMIN_TOKEN_LS_KEY = 'ww-admin-token'

/**
 * Beheertoken (in sessionStorage) + een $fetch-wrapper die het meestuurt.
 * Eén bron van waarheid voor de admin-layout en de admin-pagina's; bij een
 * 401 wist hij het token zodat de layout terugvalt op het wachtwoordformulier.
 */
export function useAdmin() {
  const token = useState<string>('ww-admin-token', () => '')

  /** sessionStorage bestaat niet tijdens prerender: pas op de client lezen */
  function hydrate() {
    if (!import.meta.client) return
    token.value = sessionStorage.getItem(ADMIN_TOKEN_LS_KEY) ?? ''
  }

  function setToken(t: string) {
    token.value = t
    if (import.meta.client) sessionStorage.setItem(ADMIN_TOKEN_LS_KEY, t)
  }

  function clearToken() {
    token.value = ''
    if (import.meta.client) sessionStorage.removeItem(ADMIN_TOKEN_LS_KEY)
  }

  // $fetch ongetypeerd aanroepen: de typed-route inferentie loopt vast op de
  // dynamische DELETE-URL (excessive stack depth)
  const rawFetch = $fetch as unknown as (url: string, opts?: Record<string, unknown>) => Promise<unknown>

  async function adminFetch<T>(url: string, opts: Record<string, unknown> = {}): Promise<T> {
    try {
      return await rawFetch(url, {
        ...opts,
        headers: { ...(opts.headers as Record<string, string>), 'x-admin-token': token.value }
      }) as T
    } catch (err) {
      if ((err as { statusCode?: number, status?: number }).statusCode === 401
        || (err as { status?: number }).status === 401) {
        clearToken()
      }
      throw err
    }
  }

  return { token, hydrate, setToken, clearToken, adminFetch }
}
