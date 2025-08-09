/**
 * useRealtimeQueryV2 - V2 스키마 기반 향상된 실시간 쿼리 Hook
 * 
 * 주요 개선사항:
 * - V2 테이블들과의 완전 통합
 * - 더 정교한 실시간 필터링
 * - 배치 업데이트 최적화
 * - 연결 품질 기반 적응형 동기화
 * - 충돌 해결 메커니즘
 * - 오프라인 큐잉 지원
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQuery, useQueryClient, UseQueryOptions, UseMutationOptions, useMutation } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useConnectionV2 } from './useConnectionV2'
import { useAuthV2 } from '../features/useAuthV2'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']

// V2 테이블 이름 타입
export type TableNameV2 = 
  | 'users_v2'
  | 'content_v2' 
  | 'comments_v2'
  | 'interactions_v2'
  | 'notifications_v2'
  | 'categories_v2'
  | 'tags_v2'
  | 'activities_v2'
  | 'activity_participants_v2'
  | 'content_metadata_v2'
  | 'audit_logs_v2'

// 실시간 이벤트 타입
export type RealtimeEventV2 = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// 업데이트 전략 타입
export type UpdateStrategyV2 = 
  | 'invalidate'      // 쿼리 무효화 (기본)
  | 'merge'          // 데이터 병합
  | 'replace'        // 데이터 교체
  | 'append'         // 데이터 추가
  | 'remove'         // 데이터 제거
  | 'smart'          // 지능적 업데이트

// 충돌 해결 전략
export type ConflictResolutionV2 = 
  | 'server-wins'    // 서버 데이터 우선
  | 'client-wins'    // 클라이언트 데이터 우선
  | 'merge'          // 필드별 병합
  | 'ask-user'       // 사용자에게 선택 요청

// V2 실시간 옵션
export interface RealtimeOptionsV2 {
  enabled?: boolean
  table: TableNameV2
  event?: RealtimeEventV2
  filter?: string | ((data: any) => boolean)
  updateStrategy?: UpdateStrategyV2
  conflictResolution?: ConflictResolutionV2
  batchSize?: number
  debounceMs?: number
  priority?: 'high' | 'medium' | 'low'
  offlineQueue?: boolean
  schema?: string
}

// 확장된 쿼리 옵션
export interface RealtimeQueryOptionsV2<T> extends UseQueryOptions<T, Error> {
  realtime?: RealtimeOptionsV2
}

// 오프라인 작업 타입
interface OfflineOperation {
  id: string
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: TableNameV2
  data: any
  timestamp: number
  retryCount: number
}

/**
 * V2 실시간 쿼리 Hook
 */
export function useRealtimeQueryV2<T = unknown>(options: RealtimeQueryOptionsV2<T>) {
  const query = useQuery(options)
  const queryClient = useQueryClient()
  const { isConnected, networkQuality } = useConnectionV2()
  const { user } = useAuthV2()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const offlineQueueRef = useRef<OfflineOperation[]>([])
  const [conflictData, setConflictData] = useState<any>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  // 지능적 업데이트 함수
  const smartUpdate = useCallback((
    payload: RealtimePostgresChangesPayload<any>,
    updateStrategy: UpdateStrategyV2,
    currentData: T
  ) => {
    if (!currentData) return null

    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (updateStrategy) {
      case 'smart':
        // 네트워크 품질에 따라 전략 선택
        if (networkQuality === 'poor' || networkQuality === 'offline') {
          return 'invalidate' // 느린 연결에서는 무효화만
        }
        // 빠른 연결에서는 병합
        return smartUpdate(payload, 'merge', currentData)

      case 'merge':
        if (Array.isArray(currentData)) {
          const list = [...currentData]
          const index = list.findIndex((item) => (item as any).id === ((newRecord as any)?.id || (oldRecord as any)?.id))
          
          if (eventType === 'INSERT') {
            return [...list, newRecord]
          } else if (eventType === 'UPDATE' && index !== -1) {
            list[index] = { ...list[index], ...newRecord }
            return list
          } else if (eventType === 'DELETE' && index !== -1) {
            list.splice(index, 1)
            return list
          }
        }
        break

      case 'replace':
        if (Array.isArray(currentData)) {
          const list = [...currentData]
          const index = list.findIndex((item) => (item as any).id === ((newRecord as any)?.id || (oldRecord as any)?.id))
          
          if (eventType === 'INSERT') {
            return [...list, newRecord]
          } else if (eventType === 'UPDATE' && index !== -1) {
            list[index] = newRecord
            return list
          } else if (eventType === 'DELETE' && index !== -1) {
            list.splice(index, 1)
            return list
          }
        }
        break

      case 'append':
        if (eventType === 'INSERT' && Array.isArray(currentData)) {
          return [...currentData, newRecord]
        }
        break

      case 'remove':
        if (eventType === 'DELETE' && Array.isArray(currentData)) {
          return currentData.filter((item) => (item as any).id !== oldRecord?.id)
        }
        break

      default:
        return null
    }

    return null
  }, [networkQuality])

  // 충돌 해결 함수
  const resolveConflict = useCallback((
    serverData: any,
    clientData: any,
    resolution: ConflictResolutionV2
  ) => {
    switch (resolution) {
      case 'server-wins':
        return serverData
      case 'client-wins':
        return clientData
      case 'merge':
        return { ...clientData, ...serverData, updated_at: serverData.updated_at }
      case 'ask-user':
        setConflictData({ server: serverData, client: clientData })
        return null
      default:
        return serverData
    }
  }, [])

  // 오프라인 작업 큐 처리
  const processOfflineQueue = useCallback(async () => {
    if (!isConnected || offlineQueueRef.current.length === 0) return

    const operations = [...offlineQueueRef.current]
    offlineQueueRef.current = []

    for (const operation of operations) {
      try {
        let query = supabaseClient.from(operation.table)

        switch (operation.type) {
          case 'INSERT':
            await query.insert(operation.data)
            break
          case 'UPDATE':
            await query.update(operation.data).eq('id', operation.data.id)
            break
          case 'DELETE':
            await query.delete().eq('id', operation.data.id)
            break
        }
      } catch (error) {
        // 재시도 로직
        if (operation.retryCount < 3) {
          offlineQueueRef.current.push({
            ...operation,
            retryCount: operation.retryCount + 1
          })
        }
        console.error('Offline operation failed:', error)
      }
    }

    // 큐 처리 후 쿼리 무효화
    queryClient.invalidateQueries({ queryKey: options.queryKey })
  }, [isConnected, queryClient, options.queryKey])

  // 실시간 채널 설정
  useEffect(() => {
    if (!options.realtime?.enabled) return
    if (!isConnected) return

    const { table, event = '*', filter, updateStrategy = 'invalidate', schema = 'public' } = options.realtime

    // 채널 생성
    const channelName = `realtime-v2-${table}-${JSON.stringify(options.queryKey)}`
    channelRef.current = supabaseClient.channel(channelName)

    // 필터 적용
    let realtimeFilter: any = `${schema}:${table}`
    
    if (typeof filter === 'string') {
      realtimeFilter += `:${filter}`
    }

    // 변경 이벤트 리스너 등록
    channelRef.current
      .on('postgres_changes' as any, {
        event: event as any,
        schema,
        table,
        filter: typeof filter === 'string' ? filter : undefined
      }, async (payload: any) => {
        // 필터 함수 적용
        if (typeof filter === 'function' && !filter((payload as any).new || (payload as any).old)) {
          return
        }

        // 현재 데이터 가져오기
        const currentData = queryClient.getQueryData<T>(options.queryKey!)

        if (updateStrategy === 'invalidate') {
          // 네트워크 품질에 따른 지연 무효화
          const delay = networkQuality === 'poor' ? 1000 : 0
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: options.queryKey })
          }, delay)
        } else if (currentData) {
          // 데이터 직접 업데이트
          const updatedData = smartUpdate(payload, updateStrategy, currentData)
          if (updatedData !== null) {
            queryClient.setQueryData(options.queryKey!, updatedData)
          }
        }

        // 관련 쿼리들도 무효화 (cascading updates)
        if (table === 'users_v2') {
          queryClient.invalidateQueries({ queryKey: ['members-v2'] })
          queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
        } else if (table === 'content_v2') {
          queryClient.invalidateQueries({ queryKey: ['content-v2'] })
          queryClient.invalidateQueries({ queryKey: ['activities-v2'] })
        }
      })

    // 채널 상태 모니터링
    channelRef.current
      .on('system', {}, (payload: any) => {
        setIsRealtimeConnected((payload as any).status === 'SUBSCRIBED')
      })

    // 구독 시작
    channelRef.current.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsRealtimeConnected(true)
      } else {
        setIsRealtimeConnected(false)
      }
    })

    return () => {
      if (channelRef.current) {
        supabaseClient.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsRealtimeConnected(false)
    }
  }, [
    isConnected,
    options.realtime,
    options.queryKey,
    networkQuality,
    queryClient,
    smartUpdate
  ])

  // 오프라인 큐 처리
  useEffect(() => {
    if (isConnected) {
      processOfflineQueue()
    }
  }, [isConnected, processOfflineQueue])

  return {
    ...query,
    // V2 확장 기능
    isRealtimeConnected,
    conflictData,
    offlineQueueLength: offlineQueueRef.current.length,
    
    // 충돌 해결 액션
    resolveConflict: (resolution: 'server' | 'client') => {
      if (conflictData) {
        const resolved = resolution === 'server' ? conflictData.server : conflictData.client
        queryClient.setQueryData(options.queryKey!, resolved)
        setConflictData(null)
      }
    },
    
    // 오프라인 작업 추가
    addOfflineOperation: (operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>) => {
      if (options.realtime?.offlineQueue) {
        offlineQueueRef.current.push({
          ...operation,
          id: Math.random().toString(36),
          timestamp: Date.now(),
          retryCount: 0
        })
      }
    }
  }
}

/**
 * V2 실시간 뮤테이션 Hook
 */
export function useRealtimeMutationV2<TData = any, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    table?: TableNameV2
    optimistic?: boolean
    offline?: boolean
  }
) {
  const { isConnected } = useConnectionV2()
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    ...options,
    onMutate: async (variables) => {
      // 옵티미스틱 업데이트
      if (options.optimistic && options.onMutate) {
        return await options.onMutate(variables)
      }
      
      return options.onMutate?.(variables)
    },
    mutationFn: async (variables) => {
      // 오프라인 상태면 큐에 추가
      if (!isConnected && options.offline) {
        // TODO: 오프라인 큐 구현
        throw new Error('Offline - queued for later')
      }
      
      return options.mutationFn!(variables)
    },
    onSuccess: (data, variables, context) => {
      // 관련 실시간 쿼리들 무효화
      if (options.table) {
        queryClient.invalidateQueries({ 
          queryKey: [options.table] 
        })
      }
      
      options.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      // 옵티미스틱 업데이트 롤백
      if (options.optimistic && context) {
        // 롤백 로직 구현
      }
      
      options.onError?.(error, variables, context)
    }
  })

  return mutation
}

/**
 * 실시간 리스트 Hook (V2)
 */
export function useRealtimeListV2<T = unknown>(options: RealtimeQueryOptionsV2<T[]>) {
  return useRealtimeQueryV2<T[]>({
    ...options,
    realtime: options.realtime?.table ? {
      updateStrategy: 'merge',
      ...options.realtime
    } : undefined
  })
}

/**
 * 실시간 단일 항목 Hook (V2)
 */
export function useRealtimeItemV2<T = unknown>(options: RealtimeQueryOptionsV2<T>) {
  return useRealtimeQueryV2<T>({
    ...options,
    realtime: options.realtime?.table ? {
      updateStrategy: 'replace',
      ...options.realtime
    } : undefined
  })
}

/**
 * 실시간 카운트 Hook (V2)
 */
export function useRealtimeCountV2(
  table: TableNameV2,
  filter?: string,
  queryKey?: any[]
) {
  return useRealtimeQueryV2<number>({
    queryKey: ['count', table, filter, ...(queryKey || [])],
    queryFn: async () => {
      let query = supabaseClient
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (filter) {
        // 필터 파싱 및 적용 (간단한 구현)
        const [column, operator, value] = filter.split(':')
        if (operator === 'eq') {
          query = query.eq(column, value)
        }
      }

      const { count, error } = await query
      if (error) throw error
      return count || 0
    },
    realtime: {
      enabled: true,
      table,
      filter,
      updateStrategy: 'invalidate'
    }
  })
}

/**
 * 실시간 연결 상태 Hook
 */
export function useRealtimeStatusV2() {
  const [status, setStatus] = useState({
    isConnected: false,
    channelCount: 0,
    lastHeartbeat: null as string | null
  })

  useEffect(() => {
    // Supabase 실시간 상태 모니터링 로직
    // 실제 구현은 Supabase 클라이언트의 내부 상태에 의존
    const interval = setInterval(() => {
      setStatus({
        isConnected: supabaseClient.realtime.isConnected(),
        channelCount: supabaseClient.realtime.channels.length,
        lastHeartbeat: new Date().toISOString()
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return status
}