/**
 * useConnectionV2 - 단순화된 연결 상태 Hook
 */

import { useState, useEffect, useCallback } from 'react'
import { connectionCore } from '@/lib/core/connection-core'
import { supabaseClient } from '@/lib/core/connection-core'

export interface ConnectionStateV2 {
  isConnected: boolean
  isReconnecting: boolean
  connectionState: 'online' | 'offline' | 'reconnecting'
}

export function useConnectionV2() {
  const [state, setState] = useState<ConnectionStateV2>(() => {
    const status = connectionCore.getStatus()
    return {
      isConnected: status.state === 'online',
      isReconnecting: status.state === 'reconnecting',
      connectionState: status.state
    }
  })

  useEffect(() => {
    // 클라이언트 변경 감지
    const unsubscribe = connectionCore.onClientChange(() => {
      const status = connectionCore.getStatus()
      setState({
        isConnected: status.state === 'online',
        isReconnecting: status.state === 'reconnecting',
        connectionState: status.state
      })
    })

    // 초기 상태 업데이트
    const status = connectionCore.getStatus()
    setState({
      isConnected: status.state === 'online',
      isReconnecting: status.state === 'reconnecting',
      connectionState: status.state
    })

    return unsubscribe
  }, [])

  const reconnect = useCallback(async () => {
    try {
      await connectionCore.recreateClient()
      return true
    } catch (error) {
      console.error('[useConnectionV2] Reconnect failed:', error)
      return false
    }
  }, [])

  return {
    ...state,
    reconnect,
    // 호환성을 위한 추가 필드
    isError: state.connectionState === 'offline',
    isConnecting: state.isReconnecting,
    // 더미 값들 (호환성용)
    lastError: null,
    reconnectAttempts: 0,
    isVisible: true,
    networkQuality: 'good' as const,
    latency: 100,
    realtimeStatus: 'connected' as const,
    metrics: {
      averageLatency: 100,
      uptime: 0,
      totalReconnects: 0,
      lastDisconnection: null
    },
    heartbeat: {
      isActive: true,
      lastBeat: new Date().toISOString(),
      missedBeats: 0
    },
    refresh: async () => true,
    testConnection: async () => ({ success: true, latency: 100 })
  }
}