/**
 * AuthManager - 통합 인증 관리 시스템
 * 
 * 단일 책임: 인증 상태 및 세션 관리
 * - 세션 생명주기 관리
 * - 프로필 데이터 캐싱
 * - 토큰 갱신 자동화
 */

import { Session, User, AuthError } from '@supabase/supabase-js'
import { connectionCore } from './connection-core'
import type { Tables } from '../database.types'

// 사용자 프로필 타입
export type UserProfile = Tables<'users_v2'>

// 인증 상태
export interface AuthState {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: AuthError | null
}

// 인증 이벤트
export type AuthEvent = 
  | { type: 'SESSION_LOADED'; session: Session | null }
  | { type: 'PROFILE_LOADED'; profile: UserProfile }
  | { type: 'SIGN_IN'; session: Session }
  | { type: 'SIGN_OUT' }
  | { type: 'ERROR'; error: AuthError }
  | { type: 'LOADING'; loading: boolean }

/**
 * AuthManager 클래스
 * 인증 및 세션 관리를 담당
 */
export class AuthManager {
  private static instance: AuthManager
  private state: AuthState
  private listeners: Set<(state: AuthState) => void>
  private refreshTimer: NodeJS.Timeout | null = null
  private profileCache: { data: UserProfile | null; timestamp: number } | null = null
  private readonly PROFILE_CACHE_TTL = 30 * 60 * 1000 // 30분

  private constructor() {
    this.state = {
      session: null,
      user: null,
      profile: null,
      loading: true,
      error: null
    }
    this.listeners = new Set()
    this.initialize()
  }

  /**
   * 싱글톤 인스턴스
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  /**
   * 초기화
   */
  private async initialize(): Promise<void> {
    const client = connectionCore.getClient()
    
    // 초기 세션 로드
    await this.loadSession()
    
    // Auth 상태 변경 구독
    client.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthManager] Auth state changed:', event)
      
      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            await this.handleSignIn(session)
          }
          break
        
        case 'SIGNED_OUT':
          this.handleSignOut()
          break
        
        case 'TOKEN_REFRESHED':
          if (session) {
            this.updateState({ session, user: session.user })
            this.scheduleTokenRefresh(session)
          }
          break
        
        case 'USER_UPDATED':
          if (session) {
            // 프로필 캐시 무효화 및 재로드
            this.profileCache = null
            await this.loadProfile(session.user.id)
          }
          break
      }
    })

    // ConnectionCore 상태 구독
    connectionCore.subscribe(async (status) => {
      if (status.state === 'connected' && status.isVisible) {
        // 연결 복구 시 세션 확인
        // getSession()을 사용하므로 항상 안전하게 동기화됨
        await this.validateSession()
      }
    })
  }

  /**
   * 세션 로드
   */
  private async loadSession(): Promise<void> {
    this.updateState({ loading: true })
    
    try {
      const client = connectionCore.getClient()
      const { data: { session }, error } = await client.auth.getSession()
      
      if (error) throw error
      
      if (session) {
        await this.handleSignIn(session)
      } else {
        this.updateState({ 
          session: null, 
          user: null, 
          profile: null,
          loading: false 
        })
      }
    } catch (error) {
      console.error('[AuthManager] Failed to load session:', error)
      this.updateState({ 
        error: error as AuthError,
        loading: false 
      })
    }
  }

  /**
   * 로그인 처리
   */
  private async handleSignIn(session: Session): Promise<void> {
    this.updateState({ 
      session,
      user: session.user,
      error: null
    })
    
    // 프로필 로드
    await this.loadProfile(session.user.id)
    
    // 토큰 갱신 스케줄링
    this.scheduleTokenRefresh(session)
    
    this.updateState({ loading: false })
  }

  /**
   * 로그아웃 처리
   */
  private handleSignOut(): void {
    // 타이머 정리
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    
    // 캐시 정리
    this.profileCache = null
    
    // 상태 초기화
    this.updateState({
      session: null,
      user: null,
      profile: null,
      error: null,
      loading: false
    })
  }

  /**
   * 프로필 로드 (캐싱 적용)
   */
  private async loadProfile(userId: string): Promise<void> {
    // 캐시 확인
    if (this.profileCache && Date.now() - this.profileCache.timestamp < this.PROFILE_CACHE_TTL) {
      if (this.profileCache.data) {
        this.updateState({ profile: this.profileCache.data })
        return
      }
    }
    
    try {
      const client = connectionCore.getClient()
      const { data, error } = await client
        .from('users_v2')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      
      // 캐시 업데이트
      this.profileCache = {
        data,
        timestamp: Date.now()
      }
      
      this.updateState({ profile: data })
    } catch (error) {
      console.error('[AuthManager] Failed to load profile:', error)
      // 프로필 로드 실패는 치명적이지 않으므로 에러 상태로 변경하지 않음
    }
  }

  /**
   * 토큰 갱신 스케줄링
   */
  private scheduleTokenRefresh(session: Session): void {
    // 기존 타이머 정리
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
    }
    
    // 만료 10분 전에 갱신
    const expiresAt = session.expires_at || 0
    const now = Math.floor(Date.now() / 1000)
    const refreshIn = Math.max((expiresAt - now - 600) * 1000, 60000) // 최소 1분
    
    console.log(`[AuthManager] Scheduling token refresh in ${refreshIn}ms`)
    
    this.refreshTimer = setTimeout(() => {
      this.refreshSession()
    }, refreshIn)
  }

  /**
   * 세션 갱신
   */
  private async refreshSession(): Promise<void> {
    try {
      const client = connectionCore.getClient()
      const { data: { session }, error } = await client.auth.refreshSession()
      
      if (error) throw error
      
      if (session) {
        this.updateState({ session, user: session.user })
        this.scheduleTokenRefresh(session)
      }
    } catch (error) {
      console.error('[AuthManager] Failed to refresh session:', error)
      this.updateState({ error: error as AuthError })
    }
  }

  /**
   * 세션 유효성 검증
   * localStorage에서 직접 읽어와서 모듈 간 동기화 보장
   * 3초 타임아웃으로 CircuitBreaker 트리거 방지
   */
  private async validateSession(): Promise<void> {
    try {
      const client = connectionCore.getClient()
      
      // 3초 타임아웃으로 getSession() 호출
      // CircuitBreaker가 영구 오프라인 모드로 빠지는 것을 방지
      const sessionPromise = client.auth.getSession()
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Session validation timeout after 3 seconds')), 3000)
      })
      
      try {
        // Promise.race로 먼저 완료되는 것 사용
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ])
        
        if (error) throw error
        
        if (session) {
          // 세션이 유효하면 상태 업데이트
          this.updateState({ 
            session, 
            user: session.user,
            error: null 
          })
          
          // 토큰 갱신 스케줄링
          this.scheduleTokenRefresh(session)
          
          // 프로필이 없으면 로드
          if (!this.state.profile) {
            await this.loadProfile(session.user.id)
          }
        } else {
          // 세션이 없으면 로그아웃 처리
          console.log('[AuthManager] No valid session found, signing out')
          this.handleSignOut()
        }
      } catch (timeoutError) {
        // 타임아웃 발생 시 CircuitBreaker 리셋 시도
        console.warn('[AuthManager] Session validation timeout, checking CircuitBreaker status')
        
        // CircuitBreaker가 Open 상태인지 확인
        if (connectionCore.isCircuitBreakerOpen()) {
          console.log('[AuthManager] CircuitBreaker is open, attempting force reset')
          try {
            await connectionCore.forceReset()
            // 리셋 후 재시도
            const { data: { session }, error } = await client.auth.getSession()
            
            if (!error && session) {
              this.updateState({ 
                session, 
                user: session.user,
                error: null 
              })
              this.scheduleTokenRefresh(session)
              if (!this.state.profile) {
                await this.loadProfile(session.user.id)
              }
              return
            }
          } catch (resetError) {
            console.error('[AuthManager] Force reset failed:', resetError)
          }
        }
        
        // 타임아웃이나 리셋 실패 시 로그아웃 처리
        console.log('[AuthManager] Session validation failed due to timeout, signing out')
        this.handleSignOut()
      }
    } catch (error) {
      console.error('[AuthManager] Session validation failed:', error)
      // 에러 시 로그아웃 처리
      this.handleSignOut()
    }
  }

  /**
   * 상태 업데이트
   */
  private updateState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  /**
   * 리스너 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error('[AuthManager] Listener error:', error)
      }
    })
  }

  // Public API

  /**
   * 로그인
   */
  async signIn(email: string, password: string): Promise<{ error: AuthError | null }> {
    this.updateState({ loading: true, error: null })
    
    try {
      const client = connectionCore.getClient()
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // onAuthStateChange가 처리
      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateState({ error: authError, loading: false })
      return { error: authError }
    }
  }

  /**
   * 회원가입
   */
  async signUp(
    email: string, 
    password: string, 
    metadata?: { name?: string; department?: string }
  ): Promise<{ error: AuthError | null }> {
    this.updateState({ loading: true, error: null })
    
    try {
      const client = connectionCore.getClient()
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (error) {
      const authError = error as AuthError
      this.updateState({ error: authError, loading: false })
      return { error: authError }
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const client = connectionCore.getClient()
      const { error } = await client.auth.signOut()
      
      if (error) throw error
      
      // localStorage 정리
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('kepco-') || key.includes('supabase'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
      
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  /**
   * 프로필 업데이트
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
    if (!this.state.user) {
      return { error: new Error('Not authenticated') }
    }
    
    try {
      const client = connectionCore.getClient()
      const { error } = await client
        .from('users_v2')
        .update(updates)
        .eq('id', this.state.user.id)
      
      if (error) throw error
      
      // 캐시 무효화 및 재로드
      this.profileCache = null
      await this.loadProfile(this.state.user.id)
      
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * 상태 구독
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener)
    
    // 즉시 현재 상태 전달
    listener(this.getState())
    
    // 구독 해제 함수 반환
    return () => {
      this.listeners.delete(listener)
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

  /**
   * 인증 여부 확인
   */
  isAuthenticated(): boolean {
    return !!this.state.session
  }

  /**
   * 백그라운드 복귀 후 세션 갱신
   * Circuit Breaker를 우회하여 직접 세션 갱신
   */
  async refreshSessionAfterBackground(): Promise<{ error: Error | null }> {
    console.log('[AuthManager] Refreshing session after background')
    
    try {
      const client = connectionCore.getClient()
      
      // Circuit Breaker를 우회하여 직접 세션 갱신 시도
      const { data, error } = await client.auth.refreshSession()
      
      if (error) {
        console.error('[AuthManager] Failed to refresh session:', error)
        return { error }
      }
      
      if (data.session) {
        console.log('[AuthManager] Session refreshed successfully')
        // 세션 상태 업데이트
        this.updateState({
          session: data.session,
          user: data.session.user,
          loading: false,
          error: null
        })
        // 프로필 재로드
        await this.loadProfile(data.session.user.id)
        return { error: null }
      }
      
      console.warn('[AuthManager] No session returned from refresh')
      return { error: new Error('No session available') }
      
    } catch (error) {
      console.error('[AuthManager] Exception during session refresh:', error)
      return { error: error as Error }
    }
  }

  /**
   * 이메일 재인증 요청
   */
  async resendEmailConfirmation(email: string): Promise<{ error: AuthError | null }> {
    try {
      const client = connectionCore.getClient()
      const { error } = await client.auth.resend({
        type: 'signup',
        email
      })
      
      if (error) throw error
      
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    }
  }
}

// 싱글톤 인스턴스 export
export const authManager = AuthManager.getInstance()