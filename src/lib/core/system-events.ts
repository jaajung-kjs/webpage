/**
 * System Event Bus - 시스템 간 느슨한 결합을 위한 이벤트 버스
 * 
 * 목적:
 * - Core 시스템 간 직접 의존성 제거
 * - 이벤트 기반 통신으로 테스트 가능성 향상
 * - 명확한 시스템 간 계약 정의
 */

import { EventEmitter } from 'events'
import type { ConnectionStatus } from './connection-core'
import type { Session, User } from '@supabase/supabase-js'
import type { Tables } from '../database.types'

// 시스템 이벤트 타입 정의
export enum SystemEventType {
  // Connection 이벤트
  CONNECTION_READY = 'CONNECTION_READY',
  CONNECTION_LOST = 'CONNECTION_LOST',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  CONNECTION_RECOVERING = 'CONNECTION_RECOVERING',
  
  // Auth 이벤트
  AUTH_STATE_CHANGED = 'AUTH_STATE_CHANGED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  
  // Realtime 이벤트
  REALTIME_READY = 'REALTIME_READY',
  REALTIME_SUBSCRIPTION_ADDED = 'REALTIME_SUBSCRIPTION_ADDED',
  REALTIME_SUBSCRIPTION_REMOVED = 'REALTIME_SUBSCRIPTION_REMOVED',
  REALTIME_ERROR = 'REALTIME_ERROR',
  
  // Recovery 이벤트
  RECOVERY_STARTED = 'RECOVERY_STARTED',
  RECOVERY_COMPLETED = 'RECOVERY_COMPLETED',
  RECOVERY_FAILED = 'RECOVERY_FAILED'
}

// 이벤트 페이로드 타입 정의
export interface SystemEventPayloads {
  [SystemEventType.CONNECTION_READY]: {
    status: ConnectionStatus
    timestamp: number
  }
  [SystemEventType.CONNECTION_LOST]: {
    status: ConnectionStatus
    reason?: string
    timestamp: number
  }
  [SystemEventType.CONNECTION_ERROR]: {
    error: Error
    status: ConnectionStatus
    timestamp: number
  }
  [SystemEventType.CONNECTION_RECOVERING]: {
    attempt: number
    maxAttempts: number
    timestamp: number
  }
  
  [SystemEventType.AUTH_STATE_CHANGED]: {
    session: Session | null
    user: User | null
    profile: Tables<'users_v2'> | null
    timestamp: number
  }
  [SystemEventType.SESSION_EXPIRED]: {
    lastSession: Session
    timestamp: number
  }
  [SystemEventType.PROFILE_UPDATED]: {
    profile: Tables<'users_v2'>
    changes: Partial<Tables<'users_v2'>>
    timestamp: number
  }
  [SystemEventType.SIGN_IN]: {
    session: Session
    user: User
    timestamp: number
  }
  [SystemEventType.SIGN_OUT]: {
    timestamp: number
  }
  
  [SystemEventType.REALTIME_READY]: {
    subscriptionCount: number
    timestamp: number
  }
  [SystemEventType.REALTIME_SUBSCRIPTION_ADDED]: {
    subscriptionId: string
    table: string
    event?: string
    timestamp: number
  }
  [SystemEventType.REALTIME_SUBSCRIPTION_REMOVED]: {
    subscriptionId: string
    reason?: string
    timestamp: number
  }
  [SystemEventType.REALTIME_ERROR]: {
    error: Error
    subscriptionId?: string
    timestamp: number
  }
  
  [SystemEventType.RECOVERY_STARTED]: {
    strategy: 'light' | 'partial' | 'full'
    reason: string
    timestamp: number
  }
  [SystemEventType.RECOVERY_COMPLETED]: {
    strategy: 'light' | 'partial' | 'full'
    duration: number
    successCount: number
    errorCount: number
    timestamp: number
  }
  [SystemEventType.RECOVERY_FAILED]: {
    error: Error
    strategy: 'light' | 'partial' | 'full'
    timestamp: number
  }
}

// 이벤트 리스너 타입
export type SystemEventListener<T extends SystemEventType> = (
  payload: SystemEventPayloads[T]
) => void

// 메트릭 수집을 위한 인터페이스
interface EventMetrics {
  eventCount: Map<SystemEventType, number>
  lastEmitted: Map<SystemEventType, Date>
  listenerCount: Map<SystemEventType, number>
  processingTime: Map<SystemEventType, number[]>
}

/**
 * SystemEventBus 클래스
 * 싱글톤 패턴으로 구현된 중앙 이벤트 버스
 */
export class SystemEventBus extends EventEmitter {
  private static instance: SystemEventBus
  private metrics: EventMetrics
  private isDebugMode: boolean
  
  private constructor() {
    super()
    
    // 메모리 누수 방지를 위한 최대 리스너 설정
    this.setMaxListeners(50)
    
    // 메트릭 초기화
    this.metrics = {
      eventCount: new Map(),
      lastEmitted: new Map(),
      listenerCount: new Map(),
      processingTime: new Map()
    }
    
    // 디버그 모드 설정
    this.isDebugMode = process.env.NODE_ENV === 'development'
  }
  
  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): SystemEventBus {
    if (!SystemEventBus.instance) {
      SystemEventBus.instance = new SystemEventBus()
    }
    return SystemEventBus.instance
  }
  
  /**
   * 이벤트 발행
   */
  emitSystemEvent<T extends SystemEventType>(
    type: T,
    payload: Omit<SystemEventPayloads[T], 'timestamp'>
  ): void {
    const startTime = performance.now()
    const fullPayload = {
      ...payload,
      timestamp: Date.now()
    } as SystemEventPayloads[T]
    
    // 메트릭 업데이트
    this.updateMetrics(type, startTime)
    
    // 디버그 로깅
    if (this.isDebugMode) {
      console.log(`[EventBus] Emitting ${type}:`, fullPayload)
    }
    
    // 이벤트 발행
    this.emit(type, fullPayload)
  }
  
  /**
   * 이벤트 구독
   */
  onSystemEvent<T extends SystemEventType>(
    type: T,
    listener: SystemEventListener<T>
  ): () => void {
    // 리스너 등록
    this.on(type, listener)
    
    // 리스너 카운트 업데이트
    const currentCount = this.metrics.listenerCount.get(type) || 0
    this.metrics.listenerCount.set(type, currentCount + 1)
    
    // 디버그 로깅
    if (this.isDebugMode) {
      console.log(`[EventBus] Listener added for ${type}. Total: ${currentCount + 1}`)
    }
    
    // cleanup 함수 반환
    return () => {
      this.off(type, listener)
      const count = this.metrics.listenerCount.get(type) || 0
      this.metrics.listenerCount.set(type, Math.max(0, count - 1))
      
      if (this.isDebugMode) {
        console.log(`[EventBus] Listener removed for ${type}. Total: ${Math.max(0, count - 1)}`)
      }
    }
  }
  
  /**
   * 한 번만 실행되는 이벤트 구독
   */
  onceSystemEvent<T extends SystemEventType>(
    type: T,
    listener: SystemEventListener<T>
  ): void {
    this.once(type, listener)
  }
  
  /**
   * 메트릭 업데이트
   */
  private updateMetrics(type: SystemEventType, startTime: number): void {
    // 이벤트 카운트 증가
    const count = this.metrics.eventCount.get(type) || 0
    this.metrics.eventCount.set(type, count + 1)
    
    // 마지막 발행 시간 업데이트
    this.metrics.lastEmitted.set(type, new Date())
    
    // 처리 시간 기록
    const processingTime = performance.now() - startTime
    const times = this.metrics.processingTime.get(type) || []
    times.push(processingTime)
    
    // 최대 100개까지만 유지 (메모리 관리)
    if (times.length > 100) {
      times.shift()
    }
    
    this.metrics.processingTime.set(type, times)
  }
  
  /**
   * 메트릭 조회
   */
  getMetrics(): {
    eventCounts: Record<string, number>
    listenerCounts: Record<string, number>
    averageProcessingTimes: Record<string, number>
  } {
    const eventCounts: Record<string, number> = {}
    const listenerCounts: Record<string, number> = {}
    const averageProcessingTimes: Record<string, number> = {}
    
    // 이벤트 카운트
    this.metrics.eventCount.forEach((count, type) => {
      eventCounts[type] = count
    })
    
    // 리스너 카운트
    this.metrics.listenerCount.forEach((count, type) => {
      listenerCounts[type] = count
    })
    
    // 평균 처리 시간
    this.metrics.processingTime.forEach((times, type) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        averageProcessingTimes[type] = Math.round(avg * 100) / 100
      }
    })
    
    return {
      eventCounts,
      listenerCounts,
      averageProcessingTimes
    }
  }
  
  /**
   * 모든 리스너 제거 (정리용)
   */
  clearAllListeners(): void {
    this.removeAllListeners()
    this.metrics.listenerCount.clear()
    
    if (this.isDebugMode) {
      console.log('[EventBus] All listeners cleared')
    }
  }
  
  /**
   * 특정 이벤트의 모든 리스너 제거
   */
  clearEventListeners(type: SystemEventType): void {
    this.removeAllListeners(type)
    this.metrics.listenerCount.delete(type)
    
    if (this.isDebugMode) {
      console.log(`[EventBus] All listeners for ${type} cleared`)
    }
  }
  
  /**
   * 디버그 모드 토글
   */
  setDebugMode(enabled: boolean): void {
    this.isDebugMode = enabled
  }
}

// 싱글톤 인스턴스 export
export const systemEventBus = SystemEventBus.getInstance()