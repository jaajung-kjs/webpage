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
  private profileSubscription: any = null
  
  // 싱글톤 인스턴스
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }
  
  private constructor() {
    this.initialize()
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
      if (!this.profileSubscription) {
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
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe()
    }
    
    this.profileSubscription = supabase
      .channel(`session_profile_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${userId}`
      }, async () => {
        // 프로필 변경 시 캐시 무효화 및 재로드
        const cacheKey = getCacheKey('auth', 'profile', userId)
        CacheManager.invalidate(cacheKey)
        await this.loadProfile(userId, true)
      })
      .subscribe()
  }
  
  /**
   * 세션 갱신 스케줄링 (최적화)
   */
  private scheduleRefresh(session: Session) {
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
          this.scheduleRefresh(newSession)
        }
      } catch (error) {
        console.error('Session refresh failed:', error instanceof Error ? error.message : JSON.stringify(error))
      }
    }, refreshIn)
  }
  
  /**
   * 상태 업데이트
   */
  private updateState(updates: Partial<SessionState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }
  
  /**
   * 리스너 알림
   */
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }
  
  /**
   * 정리
   */
  private cleanup() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    if (this.profileSubscription) {
      this.profileSubscription.unsubscribe()
      this.profileSubscription = null
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