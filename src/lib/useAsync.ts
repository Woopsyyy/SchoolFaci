import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Small async fetch helper: runs a query, tracks loading/error, and cancels the
 * result if the component unmounted or the deps changed before it resolved.
 */
export function useAsync<T>(
  query: () => Promise<T>,
  deps: unknown[],
  initial: T,
): { data: T; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    queryRef
      .current()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return { data, loading, error, reload }
}