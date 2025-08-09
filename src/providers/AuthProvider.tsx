/**
 * AuthProvider - 인증 Context Provider
 * 
 * 인증 상태를 전역으로 제공
 */

'use client'

import React, { createContext, useContext } from 'react'
import { useAuthV2 as useAuthHook } from '@/hooks/features/useAuthV2'
import type { User, Session } from '@supabase/supabase-js'
import type { Tables } from '@/lib/database.types'

// 인증 Context 타입
interface AuthContextValue {
  // 상태
  user: User | null
  profile: Tables<'users_v2'> | null
  session: Session | null
  loading: boolean
  error: any
  isAuthenticated: boolean
  
  // 권한
  isMember: boolean
  isAdmin: boolean
  isLeader: boolean
  canViewDetails: boolean
  canDownload: boolean
  canMessage: boolean
  canComment: boolean
  canLike: boolean
  canReport: boolean
  canAccessAdmin: boolean
  canManageMembers: boolean
  canEditAllContent: boolean
  
  // 메서드
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: any) => Promise<{ error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: any }>
}

// Context
const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * 인증 Provider 컴포넌트
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthHook()

  return (
    <AuthContext.Provider value={auth as any}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 인증 Context 사용 Hook
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    // Return default values for build-time rendering
    return {
      // 상태
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null,
      isAuthenticated: false,
      
      // 권한
      isMember: false,
      isAdmin: false,
      isLeader: false,
      canViewDetails: false,
      canDownload: false,
      canMessage: false,
      canComment: false,
      canLike: false,
      canReport: false,
      canAccessAdmin: false,
      canManageMembers: false,
      canEditAllContent: false,
      
      // 메서드 (no-op functions for build time)
      signIn: async () => ({ error: new Error('Not available during build') }),
      signUp: async () => ({ error: new Error('Not available during build') }),
      signOut: async () => ({ error: new Error('Not available during build') }),
      updateProfile: async () => ({ error: new Error('Not available during build') }),
      resendEmailConfirmation: async () => ({ error: new Error('Not available during build') })
    }
  }
  return context
}