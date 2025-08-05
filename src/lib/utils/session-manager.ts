/**
 * Session Manager
 * 
 * 최적화된 세션 관리 시스템
 * - 세션 갱신 최적화
 * - 프로필 캐싱 강화
 * - 실시간 구독 중앙화
 */

import { Session, User } from '@supabase/supabase-js'
import { supabase, Tables } from '@/lib/supabase/client'
import { CacheManager, getCacheKey } from './cache-manager'
import { AuthMonitorLite } from './auth-monitor.lite'
import { realtimeManager } from '@/lib/realtime/RealtimeManager'

type UserProfile = Tables<'users'>

interface SessionState {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  lastRefresh: number
}

export class SessionManager {
  private static instance: SessionManager
  private state: SessionState = {
    session: null,
    profile: null,
    loading: true,
    lastRefresh: 0
  }
  private listeners = new Set<(state: SessionState) => void>()
  private refreshTimer: NodeJS.Timeout | null = null
  private profileUnsubscribe: (() => void) | null = null
  private activityTimer: NodeJS.Timeout | null = null
  private lastActivityUpdate: number = 0
  
  // 싱글톤 인스턴스
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }
  
  private constructor() {
    this.initialize()
    this.setupVisibilityHandler()
  }
  
  /**
   * 세션 초기화
   */
  private async initialize() {
    try {
      // 초기 세션 로드
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        await this.loadProfile(session.user.id)
        this.scheduleRefresh(session)
        // Update last_seen_at when session is loaded
        this.updateLastSeenAt()
        // Start activity tracking
        this.startActivityTracking()
      }
      
      this.updateState({ session, loading: false })
      
      // Auth 상태 변경 구독
      supabase.auth.onAuthStateChange(async (event, session) => {
        AuthMonitorLite.log(`auth:${event}`)
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session) {
              await this.loadProfile(session.user.id)
              this.scheduleRefresh(session)
              // Update last_seen_at on sign in or token refresh
              this.updateLastSeenAt()
              // Start activity tracking
              this.startActivityTracking()
            }
            break
            
          case 'SIGNED_OUT':
            this.cleanup()
            break
            
          case 'USER_UPDATED':
            if (session) {
              await this.loadProfile(session.user.id, true)
            }
            break
        }
        
        this.updateState({ session, loading: false })
      })
    } catch (error) {
      console.error('Session initialization error:', error instanceof Error ? error.message : JSON.stringify(error))
      this.updateState({ loading: false })
    }
  }
  
  /**
   * 프로필 로드 (캐싱 적용)
   */
  private async loadProfile(userId: string, forceRefresh = false) {
    const cacheKey = getCacheKey('auth', 'profile', userId)
    
    try {
      // 강제 새로고침 시 캐시 무효화
      if (forceRefresh) {
        CacheManager.invalidate(cacheKey)
      }
      
      const profile = await CacheManager.get<UserProfile>(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
          
          if (error) throw error
          return data
        },
        { 
          staleWhileRevalidate: !forceRefresh,
          realtime: true 
        }
      )
      
      this.updateState({ profile })
      
      // 프로필 실시간 구독 (중복 방지)
      if (!this.profileUnsubscribe) {
        this.subscribeToProfile(userId)
      }
    } catch (error) {
      console.error('Failed to load profile:', error instanceof Error ? error.message : JSON.stringify(error))
    }
  }
  
  /**
   * 프로필 실시간 구독 (중앙화)
   */
  private subscribeToProfile(userId: string) {
    // 기존 구독 정리
    if (this.profileUnsubscribe) {
      this.profileUnsubscribe()
      this.profileUnsubscribe = null
    }
    
    this.profileUnsubscribe = realtimeManager.subscribe({
      name: `session_profile_${userId}`,
      table: 'users',
      filter: `id=eq.${userId}`,
      event: '*',
      callback: async (payload) => {
        console.log('Profile updated via realtime:', payload)
        
        // 권한(role) 변경 감지
        const oldRole = this.state.profile?.role
        const newRole = payload.new?.role
        
        if (oldRole !== newRole) {
          console.log(`Role changed from ${oldRole} to ${newRole}`)
          AuthMonitorLite.log('role:changed', { oldRole, newRole })
        }
        
        // 프로필 변경 시 캐시 무효화 및 재로드
        const cacheKey = getCacheKey('auth', 'profile', userId)
        CacheManager.invalidate(cacheKey)
        await this.loadProfile(userId, true)
      }
    })
  }
  
  /**
   * 세션 갱신 스케줄링 (최적화)
   */
  private scheduleRefresh(session: Session, retryCount: number = 0) {
    // 기존 타이머 정리
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    
    // 만료 시간 계산 (10분 전에 갱신)
    const expiresAt = session.expires_at || 0
    const now = Math.floor(Date.now() / 1000)
    const refreshIn = Math.max((expiresAt - now - 600) * 1000, 60000) // 최소 1분
    
    this.refreshTimer = setTimeout(async () => {
      try {
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
        
        if (!error && newSession) {
          this.updateState({ session: newSession, lastRefresh: Date.now() })
          this.scheduleRefresh(newSession, 0) // 성공 시 재시도 횟수 초기화
          AuthMonitorLite.log('session:refreshed')
        } else {
          // 세션 갱신 실패 시 재시도
          const nextRetryCount = retryCount + 1
          const maxRetries = 3
          
          if (nextRetryCount <= maxRetries) {
            const retryDelay = Math.min(5000 * Math.pow(2, retryCount), 30000) // 지수 백오프: 5s, 10s, 20s, max 30s
            console.warn(`Session refresh failed, retrying in ${retryDelay}ms (attempt ${nextRetryCount}/${maxRetries})`)
            
            setTimeout(() => {
              this.scheduleRefresh(session, nextRetryCount)
            }, retryDelay)
          } else {
            console.error('Session refresh failed after max retries')
            AuthMonitorLite.log('session:refresh_failed')
            // 사용자에게 재로그인 필요 알림
            this.updateState({ session: null, loading: false })
          }
        }
      } catch (error) {
        console.error('Session refresh failed:', error instanceof Error ? error.message : JSON.stringify(error))
        
        // 네트워크 오류 등의 경우 재시도
        const nextRetryCount = retryCount + 1
        const maxRetries = 3
        
        if (nextRetryCount <= maxRetries) {
          const retryDelay = Math.min(5000 * Math.pow(2, retryCount), 30000)
          setTimeout(() => {
            this.scheduleRefresh(session, nextRetryCount)
          }, retryDelay)
        }
      }
    }, refreshIn)
  }
  
  /**
   * 상태 업데이트
   */
  private updateState(updates: Partial<SessionState>) {
    this.state = { ...this.state, ...updates }
    
    // 프로필이 업데이트되면 권한 플래그도 재계산
    if (updates.profile !== undefined || updates.session !== undefined) {
      // 권한 재계산은 listener에서 처리하도록 함
      AuthMonitorLite.log('session:update', {
        hasProfile: !!this.state.profile,
        hasSession: !!this.state.session,
        role: this.state.profile?.role
      })
    }
    
    this.notifyListeners()
  }
  
  /**
   * 리스너 알림
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }
  
  
  /**
   * Page Visibility API handler setup
   */
  private setupVisibilityHandler() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.state.session) {
          // 백그라운드에서 복귀 시 세션 상태 확인
          this.handleVisibilityChange()
        }
      })
      
      // Window focus 이벤트도 추가
      window.addEventListener('focus', () => {
        if (this.state.session) {
          this.handleVisibilityChange()
        }
      })
    }
  }
  
  /**
   * Handle visibility change (background recovery)
   */
  private async handleVisibilityChange() {
    try {
      // 세션 유효성 확인
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        console.warn('Session invalid after background recovery')
        this.updateState({ session: null, loading: false })
        return
      }
      
      // 토큰 만료 시간 확인
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null
      if (expiresAt) {
        const now = new Date()
        const timeUntilExpiry = expiresAt.getTime() - now.getTime()
        
        // 만료된 토큰이거나 5분 이내 만료 예정이면 갱신
        if (timeUntilExpiry <= 5 * 60 * 1000) {
          console.log('Token expired or expiring soon, refreshing...')
          const refreshResult = await this.refreshSession()
          if (!refreshResult) {
            console.warn('Failed to refresh session after background recovery')
            return
          }
        }
      }
      
      // 프로필 재로드 (권한 변경 등을 반영)
      if (session.user.id !== this.state.session?.user.id || !this.state.profile) {
        await this.loadProfile(session.user.id, true)
      }
      
      // 상태 업데이트
      this.updateState({ session, loading: false })
      
      // 활동 업데이트
      this.updateLastSeenAt()
      
      // RealtimeManager와 연동하여 연결 상태 확인 및 재연결
      if (typeof window !== 'undefined' && (window as any).realtimeManager) {
        const realtimeManager = (window as any).realtimeManager
        if (!realtimeManager.isConnected()) {
          console.log('RealtimeManager disconnected, attempting reconnect')
          realtimeManager.forceReconnect()
        }
      }
      
      AuthMonitorLite.log('session:background_recovery')
    } catch (error) {
      console.error('Error during background recovery:', error)
    }
  }
  
  /**
   * Update last_seen_at timestamp
   */
  private async updateLastSeenAt() {
    try {
      await supabase.rpc('update_my_last_seen_at')
      this.lastActivityUpdate = Date.now()
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.debug('Failed to update last_seen_at:', error)
    }
  }
  
  /**
   * Start tracking user activity
   */
  private startActivityTracking() {
    // Clear existing timer
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
    }
    
    // Update every 5 minutes if user is active
    this.activityTimer = setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden) {
        // Only update if it's been more than 5 minutes since last update
        const now = Date.now()
        if (now - this.lastActivityUpdate > 5 * 60 * 1000) {
          this.updateLastSeenAt()
        }
      }
    }, 60 * 1000) // Check every minute
    
    // Update when user becomes active after being inactive
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.state.session) {
          const now = Date.now()
          if (now - this.lastActivityUpdate > 5 * 60 * 1000) {
            this.updateLastSeenAt()
          }
        }
      })
    }
  }
  
  /**
   * 정리
   */
  private cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    if (this.activityTimer) {
      clearInterval(this.activityTimer)
      this.activityTimer = null
    }
    
    if (this.profileUnsubscribe) {
      this.profileUnsubscribe()
      this.profileUnsubscribe = null
    }
    
    
    // 로그아웃 시 모든 캐시 완전 정리
    CacheManager.invalidate()
    
    this.updateState({
      session: null,
      profile: null,
      lastRefresh: 0
    })
  }
  
  // Public API
  
  /**
   * 현재 세션 상태 가져오기
   */
  getState(): SessionState {
    return this.state
  }
  
  /**
   * 세션 상태 구독
   */
  subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    
    // 현재 상태 즉시 전달
    listener(this.state)
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners.delete(listener)
    }
  }
  
  /**
   * 강제 세션 갱신
   */
  async refreshSession(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (!error && session) {
        await this.loadProfile(session.user.id)
        this.scheduleRefresh(session)
        this.updateState({ session, lastRefresh: Date.now() })
        return true
      }
      
      return false
    } catch (error) {
      console.error('Manual session refresh failed:', error instanceof Error ? error.message : JSON.stringify(error))
      return false
    }
  }
  
  /**
   * 프로필 업데이트
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<boolean> {
    if (!this.state.session) return false
    
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.state.session.user.id)
      
      if (error) throw error
      
      // 캐시 무효화 (실시간 구독이 자동으로 업데이트함)
      const cacheKey = getCacheKey('auth', 'profile', this.state.session.user.id)
      CacheManager.invalidate(cacheKey)
      
      return true
    } catch (error) {
      console.error('Profile update failed:', error instanceof Error ? error.message : JSON.stringify(error))
      return false
    }
  }
  
  /**
   * 로그아웃
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut()
    this.cleanup()
    
    // 페이지 새로고침으로 모든 상태 완전 초기화
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }
  
  /**
   * 권한 체크 헬퍼
   */
  hasRole(roles: string[]): boolean {
    return this.state.profile ? roles.includes(this.state.profile.role) : false
  }
  
  isMember(): boolean {
    return this.hasRole(['member', 'vice-leader', 'leader', 'admin'])
  }
  
  isAdmin(): boolean {
    return this.hasRole(['vice-leader', 'leader', 'admin'])
  }
  
  isLeader(): boolean {
    return this.hasRole(['leader', 'admin'])
  }
}

// 편의 함수들
export const sessionManager = SessionManager.getInstance()

export function useSessionState() {
  return sessionManager.getState()
}

export function subscribeToSession(listener: (state: SessionState) => void) {
  return sessionManager.subscribe(listener)
}