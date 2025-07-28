/**
 * 성능 최적화 유틸리티
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 디바운스 훅
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 디바운스 검색 훅
 */
export function useDebouncedSearch(delay: number = 300) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, delay)
  
  return { search, setSearch, debouncedSearch }
}

/**
 * 쓰로틀 훅
 */
export function useThrottle<T>(value: T, limit: number = 1000): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRun = useRef(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= limit) {
        setThrottledValue(value)
        lastRun.current = Date.now()
      }
    }, limit - (Date.now() - lastRun.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

/**
 * 무한 스크롤 훅
 */
interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
}

export function useInfiniteScroll<T>(
  fetchMore: () => Promise<T[]>,
  hasMore: boolean,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = '100px' } = options
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (loading) return
    
    if (observerRef.current) observerRef.current.disconnect()
    
    observerRef.current = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setLoading(true)
          fetchMore().finally(() => setLoading(false))
        }
      },
      { threshold, rootMargin }
    )
    
    if (node) observerRef.current.observe(node)
  }, [loading, hasMore, fetchMore, threshold, rootMargin])

  return { loadMoreRef, loading }
}

/**
 * 배치 API 호출 유틸리티
 */
export async function batchFetch<T extends Record<string, Promise<any>>>(
  requests: T
): Promise<{ [K in keyof T]: Awaited<T[K]> | null }> {
  const keys = Object.keys(requests) as (keyof T)[]
  const promises = Object.values(requests)
  
  const results = await Promise.allSettled(promises)
  
  return keys.reduce((acc, key, index) => {
    const result = results[index]
    acc[key] = result.status === 'fulfilled' ? result.value : null
    return acc
  }, {} as { [K in keyof T]: Awaited<T[K]> | null })
}

/**
 * Rate Limiter 클래스
 */
export class RateLimiter {
  private attempts = new Map<string, number[]>()
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  canAttempt(key: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // 시간 창 내의 시도만 유지
    const validAttempts = attempts.filter(
      time => now - time < this.windowMs
    )
    
    if (validAttempts.length >= this.maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }
  
  getRemainingTime(key: string): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length === 0) return 0
    
    const oldestAttempt = Math.min(...attempts)
    const timeElapsed = Date.now() - oldestAttempt
    
    return Math.max(0, this.windowMs - timeElapsed)
  }
  
  reset(key: string): void {
    this.attempts.delete(key)
  }
  
  resetAll(): void {
    this.attempts.clear()
  }
}

/**
 * 지연 실행 유틸리티
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 재시도 로직
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delay?: number
    backoff?: boolean
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: initialDelay = 1000,
    backoff = true,
    onRetry
  } = options
  
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      if (onRetry) {
        onRetry(attempt, lastError)
      }
      
      const delayTime = backoff ? initialDelay * Math.pow(2, attempt - 1) : initialDelay
      await delay(delayTime)
    }
  }
  
  throw lastError!
}

/**
 * 메모이제이션 헬퍼
 */
export function memoize<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => TResult,
  keyGenerator?: (...args: TArgs) => string
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>()
  
  return (...args: TArgs): TResult => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}