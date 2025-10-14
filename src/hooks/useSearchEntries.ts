import { useEffect, useMemo, useRef, useState } from 'react'
import type { SortMode, SearchItem } from '../api/searchEntries'
import { searchEntries } from '../api/searchEntries'
import { useSearchCache, makeSearchKey } from '../stores/searchCache'

export type UseSearchState = { items: SearchItem[]; loading: boolean; error: string | null; hasMore: boolean }
export type UseSearchParams = { q: string; minChars?: number; debounceMs?: number; limit?: number; sort?: SortMode }

export function useSearchEntries({ q, minChars = 2, debounceMs = 150, limit = 25, sort = 'relevance' }: UseSearchParams) {
  const [state, setState] = useState<UseSearchState>({ items: [], loading: false, error: null, hasMore: false })
  const [offset, setOffset] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)
  const seededFromCacheRef = useRef(false)

  const qTrimmed = q.trim()
  const canSearch = qTrimmed.length >= minChars
  const cacheKey = makeSearchKey(qTrimmed, sort, limit)

  // Reset when q/sort/limit changes (prefill from cache if available)
  useEffect(() => {
    setOffset(0)
    if (canSearch) {
      const cached = useSearchCache.getState().get(cacheKey)
      if (cached && cached.items.length > 0) {
        setState({ items: cached.items, loading: false, error: null, hasMore: cached.hasMore })
        setOffset(cached.offset)
        seededFromCacheRef.current = true
        return
      }
    }
    setState({ items: [], loading: false, error: null, hasMore: false })
  }, [qTrimmed, sort, limit, cacheKey, canSearch])

  useEffect(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null }
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }

    if (!canSearch) { setState({ items: [], loading: false, error: null, hasMore: false }); return }

    // If we just seeded from cache, skip an immediate network request
    if (seededFromCacheRef.current) {
      seededFromCacheRef.current = false
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    timerRef.current = window.setTimeout(async () => {
      try {
        const controller = new AbortController(); abortRef.current = controller
        const resp = await searchEntries({ q: qTrimmed, limit, offset: 0, sort, signal: controller.signal })
        const hasMore = resp.items.length === limit
        setState({ items: resp.items, loading: false, error: null, hasMore })
        setOffset(resp.items.length)
        useSearchCache.getState().set(cacheKey, { items: resp.items, hasMore, offset: resp.items.length, timestamp: Date.now() })
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string }
        if (err?.name === 'AbortError') return
        setState(prev => ({ ...prev, loading: false, error: err?.message || 'Search failed' }))
      } finally {
        abortRef.current = null
      }
    }, debounceMs)

    return () => { if (timerRef.current) window.clearTimeout(timerRef.current) }
  }, [qTrimmed, canSearch, debounceMs, limit, sort, cacheKey])

  const loadMore = useMemo(() => {
    return async () => {
      if (!canSearch || state.loading) return
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const controller = new AbortController(); abortRef.current = controller
        const resp = await searchEntries({ q: qTrimmed, limit, offset, sort, signal: controller.signal })
        const hasMore = resp.items.length === limit
        setState(prev => ({
          items: [...prev.items, ...resp.items],
          loading: false,
          error: null,
          hasMore,
        }))
        setOffset(prev => {
          const newOffset = prev + resp.items.length
          // Update cache with appended results
          const allItems = [...state.items, ...resp.items]
          useSearchCache.getState().set(cacheKey, { items: allItems, hasMore, offset: newOffset, timestamp: Date.now() })
          return newOffset
        })
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string }
        if (err?.name === 'AbortError') return
        setState(prev => ({ ...prev, loading: false, error: err?.message || 'Search failed' }))
      } finally {
        abortRef.current = null
      }
    }
  }, [qTrimmed, canSearch, limit, offset, sort, state.loading, state.items, cacheKey])

  // Optional immediate search (bypass debounce)
  const searchNow = useMemo(() => {
    return async () => {
      if (!canSearch) return
      if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null }
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
      setState(prev => ({ ...prev, loading: true, error: null }))
      try {
        const controller = new AbortController(); abortRef.current = controller
        const resp = await searchEntries({ q: qTrimmed, limit, offset: 0, sort, signal: controller.signal })
        const hasMore = resp.items.length === limit
        setState({ items: resp.items, loading: false, error: null, hasMore })
        setOffset(resp.items.length)
        useSearchCache.getState().set(cacheKey, { items: resp.items, hasMore, offset: resp.items.length, timestamp: Date.now() })
      } catch (e: unknown) {
        const err = e as { name?: string; message?: string }
        if (err?.name === 'AbortError') return
        setState(prev => ({ ...prev, loading: false, error: err?.message || 'Search failed' }))
      } finally {
        abortRef.current = null
      }
    }
  }, [qTrimmed, canSearch, limit, sort, cacheKey])

  return { ...state, loadMore, canSearch, searchNow }
}
