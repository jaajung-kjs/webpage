/**
 * useRealtimeQueryV2 - 최적화된 실시간 쿼리 Hook
 * 
 * Supabase의 자동 재연결과 실시간 기능에 의존
 * 불필요한 복잡성 제거
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useQuery, useQueryClient, UseQueryOptions, UseMutationOptions, useMutation } from '@tanstack/react-query'
import { supabaseClient } from '@/lib/core/connection-core'
import { useConnectionV2 } from './useConnectionV2'
import { useAuth } from '@/providers'
import type { RealtimePostgresChangesPayload, RealtimeChannel } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

type Tables = Database['public']['Tables']
type Views = Database['public']['Views']

// V2 기본 테이블 이름 타입 (mutations 가능)
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
  | 'audit_logs_v2'
  | 'conversations_v2'
  | 'messages_v2'
  | 'message_read_status_v2'

// V2 뷰 이름 타입 (read-only)
export type ViewNameV2 = keyof Views

// 실시간 이벤트 타입
export type RealtimeEventV2 = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// 업데이트 전략 타입 (간소화)
export type UpdateStrategyV2 = 
  | 'invalidate'      // 쿼리 무효화 (기본)
  | 'merge'          // 데이터 병합
  | 'replace'        // 데이터 교체 (호환성)

// V2 실시간 옵션 (간소화)
export interface RealtimeOptionsV2 {
  enabled?: boolean
  table: TableNameV2
  event?: RealtimeEventV2
  filter?: string
  updateStrategy?: UpdateStrategyV2
  schema?: string
}

// 확장된 쿼리 옵션
export interface RealtimeQueryOptionsV2<T> extends UseQueryOptions<T, Error> {
  realtime?: RealtimeOptionsV2
}

/**
 * V2 실시간 쿼리 Hook (간소화)
 */
export function useRealtimeQueryV2<T = unknown>(options: RealtimeQueryOptionsV2<T>) {
  const query = useQuery(options)
  const queryClient = useQueryClient()
  const { isConnected } = useConnectionV2()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)

  // 간단한 merge 업데이트 함수
  const mergeUpdate = useCallback((
    payload: RealtimePostgresChangesPayload<any>,
    currentData: T
  ) => {
    if (!currentData || !Array.isArray(currentData)) return null

    const { eventType, new: newRecord, old: oldRecord } = payload
    const list = [...currentData]
    const recordId = (newRecord as any)?.id || (oldRecord as any)?.id
    const index = list.findIndex((item) => (item as any).id === recordId)
    
    if (eventType === 'INSERT') {
      // 중복 체크
      if (index === -1) {
        return [...list, newRecord]
      }
    } else if (eventType === 'UPDATE' && index !== -1) {
      list[index] = { ...list[index], ...newRecord }
      return list
    } else if (eventType === 'DELETE' && index !== -1) {
      list.splice(index, 1)
      return list
    }

    return null
  }, [])

  // 실시간 채널 설정
  useEffect(() => {
    if (!options.realtime?.enabled) return
    if (!isConnected) return

    const { table, event = '*', filter, updateStrategy = 'invalidate', schema = 'public' } = options.realtime

    // 채널 생성 - 고유한 채널 이름으로 충돌 방지
    const queryKeyString = Array.isArray(options.queryKey) 
      ? options.queryKey.filter(k => k != null).join('-')
      : String(options.queryKey)
    const uniqueId = Math.random().toString(36).substring(2, 11)
    const channelName = `realtime-v2-${table}-${queryKeyString}-${uniqueId}`
    channelRef.current = supabaseClient().channel(channelName)

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
        filter: filter || undefined
      }, async (payload: any) => {
        // 현재 데이터 가져오기
        const currentData = queryClient.getQueryData<T>(options.queryKey!)

        if (updateStrategy === 'invalidate') {
          // 기본: 쿼리 무효화
          queryClient.invalidateQueries({ queryKey: options.queryKey })
        } else if (updateStrategy === 'merge' && currentData) {
          // merge: 데이터 직접 업데이트
          const updatedData = mergeUpdate(payload, currentData)
          if (updatedData !== null) {
            queryClient.setQueryData(options.queryKey!, updatedData)
          }
        }

        // 관련 쿼리들도 무효화 (cascading updates) - 무한 루프 방지를 위한 강화된 조건부 무효화
        if (table === 'users_v2') {
          // 🚨 강화된 필터링: Supabase heartbeat 감지 및 차단
          const newData = (payload as any).new || {}
          const oldData = (payload as any).old || {}
          
          // Supabase 내장 heartbeat으로 인한 단순 updated_at 변경 감지
          const isHeartbeatUpdate = (
            newData.updated_at !== oldData.updated_at &&
            newData.last_seen_at === oldData.last_seen_at &&
            newData.last_login_at === oldData.last_login_at &&
            newData.activity_score === oldData.activity_score &&
            newData.name === oldData.name &&
            newData.role === oldData.role &&
            newData.department === oldData.department
          )
          
          // 메시지 관련 작업으로 인한 users_v2 업데이트는 cascade 무효화하지 않음
          // activity_score, last_seen_at 같은 자동 업데이트 필드는 관련 쿼리 무효화 생략
          const isMessageRelatedUpdate = payload.new?.last_seen_at || payload.new?.activity_score !== undefined
          
          // 🔥 핵심 수정: Heartbeat 업데이트는 완전히 무시
          if (isHeartbeatUpdate) {
            console.log('[RealtimeQueryV2] 🚫 Ignoring Supabase heartbeat update for users_v2')
            return // 즉시 리턴하여 아무 처리도 하지 않음
          }
          
          if (!isMessageRelatedUpdate) {
            // 실제 프로필 변경이나 중요한 변경사항만 cascade 무효화
            queryClient.invalidateQueries({ queryKey: ['members-v2'] })
            queryClient.invalidateQueries({ queryKey: ['profile-v2'] })
          }
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
        supabaseClient().removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsRealtimeConnected(false)
    }
  }, [
    isConnected,
    options.realtime?.enabled,
    options.realtime?.table,
    options.realtime?.event,
    options.realtime?.filter,
    options.realtime?.updateStrategy,
    options.realtime?.schema,
    queryClient,
    mergeUpdate
  ])

  return {
    ...query,
    // 간소화된 V2 확장 기능
    isRealtimeConnected
  }
}

/**
 * V2 실시간 뮤테이션 Hook (간소화)
 */
export function useRealtimeMutationV2<TData = any, TError = Error, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    table?: TableNameV2
  }
) {
  const queryClient = useQueryClient()
  
  const mutation = useMutation({
    ...options,
    onSuccess: (data, variables, context) => {
      // 관련 실시간 쿼리들 무효화
      if (options.table) {
        queryClient.invalidateQueries({ 
          queryKey: [options.table] 
        })
      }
      
      options.onSuccess?.(data, variables, context)
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
      let query = supabaseClient()
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
 * 실시간 연결 상태 Hook (간소화)
 */
export function useRealtimeStatusV2() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Supabase 실시간 연결 상태 체크
    const checkStatus = () => {
      setIsConnected(supabaseClient().realtime?.isConnected() ?? false)
    }

    // 5초마다 체크
    const interval = setInterval(checkStatus, 5000)
    checkStatus() // 초기 체크

    return () => clearInterval(interval)
  }, [])

  return { isConnected }
}