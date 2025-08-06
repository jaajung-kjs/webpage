/**
 * useRealtimeQuery - 실시간 데이터 쿼리 Hook
 * 
 * TanStack Query와 Realtime을 결합한 Hook
 */

'use client'

import { useEffect, useRef } from 'react'
import { useQuery, UseQueryOptions } from '@tanstack/react-query'
import { realtimeSync } from '@/lib/cache/realtime-sync'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeQueryOptions<T> extends UseQueryOptions<T, Error> {
  // 실시간 동기화 설정
  realtime?: {
    enabled?: boolean
    table: string
    event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
    filter?: string | ((data: T) => string)
    updateStrategy?: 'invalidate' | 'update' | 'remove'
  }
}

/**
 * 실시간 동기화가 포함된 쿼리 Hook
 */
export function useRealtimeQuery<T = unknown>(options: RealtimeQueryOptions<T>) {
  const query = useQuery(options)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // 실시간 동기화 설정
    if (options.realtime?.enabled !== false && options.realtime) {
      const { table, event, filter, updateStrategy } = options.realtime
      
      // 동적 필터 계산
      let calculatedFilter: string | undefined
      if (typeof filter === 'function' && query.data) {
        calculatedFilter = filter(query.data)
      } else if (typeof filter === 'string') {
        calculatedFilter = filter
      } else {
        calculatedFilter = undefined
      }
      
      // 동기화 ID 생성
      const syncId = `${JSON.stringify(options.queryKey)}-${table}`
      
      // 실시간 동기화 설정
      unsubscribeRef.current = realtimeSync.setupSync(syncId, {
        table,
        event,
        filter: calculatedFilter,
        queryKeys: () => [options.queryKey as unknown[]],
        updateStrategy
      })
    }

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [
    query.data,
    options.realtime?.enabled,
    options.realtime?.table,
    options.realtime?.event,
    JSON.stringify(options.queryKey)
  ])

  return query
}

/**
 * 리스트 데이터를 위한 실시간 쿼리 Hook
 */
export function useRealtimeList<T = unknown>(options: RealtimeQueryOptions<T[]>) {
  // realtime 설정이 있는 경우에만 적용
  if (options.realtime && options.realtime.table) {
    return useRealtimeQuery<T[]>({
      ...options,
      realtime: {
        ...options.realtime,
        updateStrategy: options.realtime?.updateStrategy || 'invalidate'
      }
    })
  }
  
  // realtime 설정이 없는 경우 일반 쿼리로 실행
  return useRealtimeQuery<T[]>(options)
}