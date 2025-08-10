/**
 * Connection Recovery System
 * 
 * 네트워크 연결 및 페이지 visibility 복구를 처리하는 시스템
 * - Document Visibility API를 통한 탭 전환 감지
 * - Online/Offline 이벤트를 통한 네트워크 상태 감지
 * - Focus 이벤트를 통한 윈도우 포커스 감지
 * - 자동 재연결 및 데이터 갱신
 */

import { QueryClient } from '@tanstack/react-query'
import { connectionCore } from './connection-core'
import { realtimeCore } from './realtime-core'

export class ConnectionRecoveryManager {
  private static instance: ConnectionRecoveryManager
  private queryClient: QueryClient | null = null
  private isRecovering = false
  private lastVisibilityChange = Date.now()
  private lastOnlineTime = Date.now()
  private recoveryHandlers: Set<() => void> = new Set()
  
  // 복구 설정
  private readonly RECOVERY_DELAY = 100 // 복구 시작 전 대기 시간 (ms)
  private readonly BACKGROUND_THRESHOLD = 30000 // 30초 이상 백그라운드에 있었으면 전체 갱신
  
  private constructor() {
    this.setupEventListeners()
  }
  
  static getInstance(): ConnectionRecoveryManager {
    if (!ConnectionRecoveryManager.instance) {
      ConnectionRecoveryManager.instance = new ConnectionRecoveryManager()
    }
    return ConnectionRecoveryManager.instance
  }
  
  /**
   * QueryClient 설정
   */
  setQueryClient(client: QueryClient) {
    this.queryClient = client
    console.log('[ConnectionRecovery] QueryClient set')
  }
  
  /**
   * 복구 핸들러 등록
   */
  onRecovery(handler: () => void) {
    this.recoveryHandlers.add(handler)
    return () => this.recoveryHandlers.delete(handler)
  }
  
  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return
    
    // 1. Document Visibility Change (탭 전환)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    
    // 2. Online/Offline (네트워크 상태)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    
    // 3. Window Focus (윈도우 포커스)
    window.addEventListener('focus', this.handleFocus)
    window.addEventListener('blur', this.handleBlur)
    
    // 4. Page Show (브라우저 뒤로가기/앞으로가기)
    window.addEventListener('pageshow', this.handlePageShow)
    
    console.log('[ConnectionRecovery] Event listeners registered')
  }
  
  /**
   * Visibility 변경 처리
   */
  private handleVisibilityChange = () => {
    const isHidden = document.hidden
    const now = Date.now()
    
    console.log(`[ConnectionRecovery] Visibility changed: ${isHidden ? 'hidden' : 'visible'}`)
    
    if (!isHidden) {
      // 페이지가 다시 보이게 됨
      const hiddenDuration = now - this.lastVisibilityChange
      
      if (hiddenDuration > this.BACKGROUND_THRESHOLD) {
        console.log(`[ConnectionRecovery] Page was hidden for ${hiddenDuration}ms, triggering full recovery`)
        this.triggerRecovery('visibility', true)
      } else if (hiddenDuration > 5000) {
        console.log(`[ConnectionRecovery] Page was hidden for ${hiddenDuration}ms, triggering partial recovery`)
        this.triggerRecovery('visibility', false)
      }
    }
    
    this.lastVisibilityChange = now
  }
  
  /**
   * Online 이벤트 처리
   */
  private handleOnline = () => {
    console.log('[ConnectionRecovery] Network online')
    this.lastOnlineTime = Date.now()
    this.triggerRecovery('network', true)
  }
  
  /**
   * Offline 이벤트 처리
   */
  private handleOffline = () => {
    console.log('[ConnectionRecovery] Network offline')
    // 오프라인 상태 처리 (선택사항)
  }
  
  /**
   * Focus 이벤트 처리
   */
  private handleFocus = () => {
    console.log('[ConnectionRecovery] Window focused')
    
    // Focus 시 가벼운 복구만 수행
    if (this.queryClient) {
      // 현재 페이지의 쿼리만 재검증
      this.queryClient.invalidateQueries({
        refetchType: 'active'
      })
    }
  }
  
  /**
   * Blur 이벤트 처리
   */
  private handleBlur = () => {
    console.log('[ConnectionRecovery] Window blurred')
    // 필요시 처리
  }
  
  /**
   * Page Show 이벤트 처리 (뒤로가기/앞으로가기)
   */
  private handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      console.log('[ConnectionRecovery] Page restored from cache')
      this.triggerRecovery('pageshow', true)
    }
  }
  
  /**
   * 복구 트리거
   */
  private async triggerRecovery(source: string, fullRecovery: boolean) {
    if (this.isRecovering) {
      console.log('[ConnectionRecovery] Recovery already in progress, skipping')
      return
    }
    
    this.isRecovering = true
    console.log(`[ConnectionRecovery] Starting recovery from ${source} (full: ${fullRecovery})`)
    
    try {
      // 짧은 지연 후 복구 시작 (빠른 전환 시 불필요한 복구 방지)
      await new Promise(resolve => setTimeout(resolve, this.RECOVERY_DELAY))
      
      // 1. Supabase 연결 복구
      const connectionStatus = connectionCore.getStatus()
      if (connectionStatus.state !== 'connected') {
        console.log('[ConnectionRecovery] Reconnecting to Supabase...')
        await connectionCore.connect()
      }
      
      // 2. Realtime 구독 복구
      console.log('[ConnectionRecovery] Restoring realtime subscriptions...')
      realtimeCore.handleReconnection()
      
      // 3. React Query 캐시 갱신
      if (this.queryClient) {
        if (fullRecovery) {
          console.log('[ConnectionRecovery] Full cache invalidation')
          // 모든 쿼리 무효화 (전체 갱신)
          await this.queryClient.invalidateQueries()
        } else {
          console.log('[ConnectionRecovery] Partial cache invalidation')
          // 활성 쿼리만 갱신
          await this.queryClient.invalidateQueries({
            refetchType: 'active',
            type: 'active'
          })
        }
        
        // 오래된 데이터 제거
        this.queryClient.removeQueries({
          predicate: (query) => {
            const lastFetch = query.state.dataUpdatedAt
            const age = Date.now() - lastFetch
            return age > 5 * 60 * 1000 // 5분 이상 오래된 데이터
          }
        })
      }
      
      // 4. 커스텀 복구 핸들러 실행
      this.recoveryHandlers.forEach(handler => {
        try {
          handler()
        } catch (error) {
          console.error('[ConnectionRecovery] Recovery handler error:', error)
        }
      })
      
      console.log('[ConnectionRecovery] Recovery completed successfully')
    } catch (error) {
      console.error('[ConnectionRecovery] Recovery failed:', error)
    } finally {
      this.isRecovering = false
    }
  }
  
  /**
   * 수동 복구 트리거
   */
  async manualRecovery() {
    console.log('[ConnectionRecovery] Manual recovery triggered')
    await this.triggerRecovery('manual', true)
  }
  
  /**
   * 정리
   */
  cleanup() {
    if (typeof window === 'undefined') return
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('focus', this.handleFocus)
    window.removeEventListener('blur', this.handleBlur)
    window.removeEventListener('pageshow', this.handlePageShow)
    
    this.recoveryHandlers.clear()
    console.log('[ConnectionRecovery] Cleanup completed')
  }
}

// 싱글톤 인스턴스 export
export const connectionRecovery = ConnectionRecoveryManager.getInstance()