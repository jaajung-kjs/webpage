/**
 * useConnectionV2 - V2 스키마 기반 향상된 연결 관리 Hook
 * 
 * 주요 개선사항:
 * - 더 정교한 연결 상태 관리
 * - 네트워크 품질 모니터링
 * - 자동 재연결 정책
 * - 오프라인/온라인 상태 동기화
 * - 연결 메트릭 추적
 * - 실시간 연결 품질 표시
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { connectionCore, ConnectionStatus } from '@/lib/core/connection-core'
import { supabaseClient } from '@/lib/core/connection-core'
import { useAuthV2 } from '../features/useAuthV2'
import type { Database } from '@/lib/database.types'

// 확장된 연결 상태 타입
export interface ConnectionStateV2 extends ConnectionStatus {
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline'
  latency: number | null
  bandwidth: 'high' | 'medium' | 'low' | 'unknown'
  isRealTimeConnected: boolean
  lastHeartbeat: string | null
  onlineUsers: number
}

// 연결 메트릭 타입
export interface ConnectionMetrics {
  totalReconnects: number
  averageLatency: number
  uptime: number
  lastDisconnection: string | null
  dataTransferred: {
    sent: number
    received: number
  }
}

// 네트워크 상태 감지를 위한 타입
interface NetworkInfo {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
  downlink?: number
  rtt?: number
  saveData?: boolean
}

/**
 * V2 향상된 연결 상태 관리 Hook
 */
export function useConnectionV2() {
  const { user } = useAuthV2()
  const [connectionState, setConnectionState] = useState<ConnectionStateV2>(() => ({
    ...connectionCore.getStatus(),
    networkQuality: 'offline',
    latency: null,
    bandwidth: 'unknown',
    isRealTimeConnected: false,
    lastHeartbeat: null,
    onlineUsers: 0
  }))
  
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    totalReconnects: 0,
    averageLatency: 0,
    uptime: 0,
    lastDisconnection: null,
    dataTransferred: {
      sent: 0,
      received: 0
    }
  })

  const metricsRef = useRef(metrics)
  const startTimeRef = useRef(Date.now())
  const latencyHistoryRef = useRef<number[]>([])
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null)

  // 네트워크 품질 평가 함수
  const assessNetworkQuality = useCallback((latency: number | null, bandwidth: string): ConnectionStateV2['networkQuality'] => {
    if (latency === null) return 'offline'
    
    if (latency < 50 && bandwidth === 'high') return 'excellent'
    if (latency < 100 && (bandwidth === 'high' || bandwidth === 'medium')) return 'good'
    if (latency < 200) return 'fair'
    return 'poor'
  }, [])

  // 네트워크 정보 가져오기
  const getNetworkInfo = useCallback((): NetworkInfo => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData
      }
    }
    return {}
  }, [])

  // 대역폭 계산
  const calculateBandwidth = useCallback((networkInfo: NetworkInfo): ConnectionStateV2['bandwidth'] => {
    if (networkInfo.downlink) {
      if (networkInfo.downlink > 10) return 'high'
      if (networkInfo.downlink > 1.5) return 'medium'
      return 'low'
    }
    
    if (networkInfo.effectiveType) {
      if (networkInfo.effectiveType === '4g') return 'high'
      if (networkInfo.effectiveType === '3g') return 'medium'
      return 'low'
    }
    
    return 'unknown'
  }, [])

  // 레이턴시 측정
  const measureLatency = useCallback(async (): Promise<number | null> => {
    try {
      const start = performance.now()
      const { error } = await supabaseClient
        .from('users_v2')
        .select('id')
        .limit(1)
        .single()
      
      const end = performance.now()
      const latency = end - start
      
      if (!error || error.code === 'PGRST116') { // PGRST116 = no rows
        // 레이턴시 히스토리 업데이트
        latencyHistoryRef.current.push(latency)
        if (latencyHistoryRef.current.length > 10) {
          latencyHistoryRef.current.shift()
        }
        
        return Math.round(latency)
      }
      
      return null
    } catch {
      return null
    }
  }, [])

  // 온라인 사용자 수 조회
  const getOnlineUsers = useCallback(async (): Promise<number> => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      
      const { count, error } = await supabaseClient
        .from('users_v2')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', fiveMinutesAgo)
        .eq('is_active', true)
      
      if (error) return 0
      return count || 0
    } catch {
      return 0
    }
  }, [])

  // 하트비트 업데이트 - 실제 활동 시간 업데이트는 별도 이벤트에서만 수행
  const updateHeartbeat = useCallback(async () => {
    if (!user) return
    
    // 하트비트는 연결 상태 확인용으로만 사용
    // users_v2 테이블 업데이트는 제거하여 realtime 이벤트 발생 방지
    // 실제 last_login_at 업데이트는 로그인 시에만 수행
    
    // 대신 연결 상태만 체크
    try {
      // 간단한 health check 쿼리로 대체
      const { error } = await supabaseClient
        .from('users_v2')
        .select('id')
        .eq('id', (user as any).id)
        .single()
      
      if (error) {
        console.warn('Connection check failed:', error)
      }
    } catch (error) {
      console.warn('Heartbeat check failed:', error)
    }
  }, [user])

  // 연결 상태 업데이트
  const updateConnectionState = useCallback(async () => {
    const basicStatus = connectionCore.getStatus()
    const networkInfo = getNetworkInfo()
    const latency = await measureLatency()
    const bandwidth = calculateBandwidth(networkInfo)
    const networkQuality = assessNetworkQuality(latency, bandwidth)
    const onlineUsers = await getOnlineUsers()

    // 평균 레이턴시 계산
    const avgLatency = latencyHistoryRef.current.length > 0
      ? latencyHistoryRef.current.reduce((sum, l) => sum + l, 0) / latencyHistoryRef.current.length
      : 0

    // 업타임 계산
    const uptime = Date.now() - startTimeRef.current

    setConnectionState(prev => ({
      ...basicStatus,
      networkQuality,
      latency,
      bandwidth,
      isRealTimeConnected: basicStatus.state === 'connected', // 실제 실시간 연결 상태는 별도 구현 필요
      lastHeartbeat: new Date().toISOString(),
      onlineUsers
    }))

    setMetrics(prev => ({
      ...prev,
      averageLatency: Math.round(avgLatency),
      uptime: Math.round(uptime / 1000), // seconds
      totalReconnects: prev.totalReconnects + (
        prev.lastDisconnection && basicStatus.state === 'connected' ? 1 : 0
      ),
      lastDisconnection: basicStatus.state === 'error' ? new Date().toISOString() : prev.lastDisconnection
    }))

    metricsRef.current = metrics
  }, [assessNetworkQuality, calculateBandwidth, getNetworkInfo, measureLatency, getOnlineUsers, metrics])

  // 수동 재연결
  const reconnect = useCallback(async () => {
    try {
      await connectionCore.reconnect()
      await updateConnectionState()
      return true
    } catch (error) {
      console.error('Manual reconnection failed:', error)
      return false
    }
  }, [updateConnectionState])

  // 연결 품질 테스트
  const testConnectionQuality = useCallback(async () => {
    const results = {
      latency: null as number | null,
      jitter: null as number | null,
      packetLoss: 0,
      bandwidth: 'unknown' as ConnectionStateV2['bandwidth']
    }

    try {
      // 5번의 레이턴시 측정
      const latencyTests = await Promise.all(
        Array(5).fill(0).map(() => measureLatency())
      )

      const validLatencies = latencyTests.filter(l => l !== null) as number[]
      
      if (validLatencies.length > 0) {
        results.latency = Math.round(validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length)
        
        // 지터 계산 (표준편차)
        const mean = results.latency
        const squaredDiffs = validLatencies.map(l => Math.pow(l - mean, 2))
        results.jitter = Math.round(Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / squaredDiffs.length))
        
        // 패킷 손실률
        results.packetLoss = Math.round(((5 - validLatencies.length) / 5) * 100)
      }

      results.bandwidth = calculateBandwidth(getNetworkInfo())
      
      return results
    } catch (error) {
      console.error('Connection quality test failed:', error)
      return results
    }
  }, [measureLatency, calculateBandwidth, getNetworkInfo])

  // 초기화 및 이벤트 리스너 설정
  useEffect(() => {
    // 기본 연결 상태 구독
    const unsubscribeBasic = connectionCore.subscribe((status) => {
      setConnectionState(prev => ({
        ...prev,
        ...status
      }))
    })

    // 정기적인 상태 업데이트 (30초마다)
    networkMonitorRef.current = setInterval(updateConnectionState, 30000)
    
    // 하트비트 (2분마다)
    if (user) {
      heartbeatIntervalRef.current = setInterval(updateHeartbeat, 2 * 60 * 1000)
      updateHeartbeat() // 즉시 한 번 실행
    }

    // 초기 상태 업데이트
    updateConnectionState()

    // 네트워크 상태 변화 감지
    const handleOnline = () => {
      updateConnectionState()
    }
    
    const handleOffline = () => {
      setConnectionState(prev => ({
        ...prev,
        networkQuality: 'offline',
        latency: null
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 페이지 포커스 시 상태 업데이트
    const handleFocus = () => {
      updateConnectionState()
    }
    
    window.addEventListener('focus', handleFocus)

    return () => {
      unsubscribeBasic()
      if (networkMonitorRef.current) clearInterval(networkMonitorRef.current)
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
      
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, updateConnectionState, updateHeartbeat])

  return {
    // 기본 연결 상태
    isConnected: connectionState.state === 'connected',
    isConnecting: connectionState.state === 'connecting',
    isError: connectionState.state === 'error',
    connectionState: connectionState.state,
    lastError: connectionState.lastError,
    reconnectAttempts: connectionState.reconnectAttempts,
    isVisible: connectionState.isVisible,

    // V2 확장 상태
    networkQuality: connectionState.networkQuality,
    latency: connectionState.latency,
    bandwidth: connectionState.bandwidth,
    isRealTimeConnected: connectionState.isRealTimeConnected,
    lastHeartbeat: connectionState.lastHeartbeat,
    onlineUsers: connectionState.onlineUsers,

    // 메트릭
    metrics,

    // 액션
    reconnect,
    testConnectionQuality,
    updateConnectionState,

    // 상태 체크 헬퍼
    isOnline: connectionState.state === 'connected' && connectionState.networkQuality !== 'offline',
    isSlowConnection: connectionState.networkQuality === 'poor' || connectionState.bandwidth === 'low',
    isGoodConnection: connectionState.networkQuality === 'excellent' || connectionState.networkQuality === 'good',
    
    // 품질 기반 권장사항
    recommendations: {
      shouldUseLowQualityMode: connectionState.bandwidth === 'low' || connectionState.networkQuality === 'poor',
      shouldPreloadContent: connectionState.networkQuality === 'excellent' && connectionState.bandwidth === 'high',
      shouldShowOfflineMessage: connectionState.networkQuality === 'offline',
      shouldReduceRealTimeFeatures: connectionState.latency && connectionState.latency > 500
    }
  }
}

/**
 * 간단한 연결 상태 체크 Hook
 */
export function useIsConnectedV2() {
  const { isConnected, isOnline } = useConnectionV2()
  return isConnected && isOnline
}

/**
 * 네트워크 품질만 체크하는 Hook
 */
export function useNetworkQuality() {
  const { networkQuality, latency, bandwidth } = useConnectionV2()
  
  return {
    quality: networkQuality,
    latency,
    bandwidth,
    isGood: networkQuality === 'excellent' || networkQuality === 'good',
    isPoor: networkQuality === 'poor' || networkQuality === 'offline'
  }
}

/**
 * 연결 메트릭만 조회하는 Hook
 */
export function useConnectionMetrics() {
  const { metrics } = useConnectionV2()
  return metrics
}

/**
 * 온라인 사용자 수만 조회하는 Hook
 */
export function useOnlineUsers() {
  const { onlineUsers } = useConnectionV2()
  return onlineUsers
}