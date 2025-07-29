/**
 * Auth Hooks for Supabase Authentication
 * 
 * Provides React hooks for authentication state and operations
 * Uses Supabase Auth directly - no custom API layer
 */

'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, handleSupabaseError, Tables } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { HybridCache, createCacheKey } from '@/lib/utils/cache'

// Types
type UserProfile = Tables<'users'>

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  isMember: boolean
  isAdmin: boolean
  isLeader: boolean
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, name: string, department?: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}

// Create Auth Context
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Auth Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    isAuthenticated: false,
    isMember: false,
    isAdmin: false,
    isLeader: false
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Fetch user profile from database with caching
  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    const cacheKey = createCacheKey('auth', 'profile', userId)
    const cachedProfile = HybridCache.get<UserProfile>(cacheKey)
    
    if (cachedProfile !== null) {
      return cachedProfile
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    // Cache the profile (30 minutes TTL)
    if (data) {
      HybridCache.set(cacheKey, data, 1800000) // 30 minutes
    }

    return data
  }, [])

  // Update auth state
  const updateAuthState = useCallback(async (session: Session | null) => {
    if (!session) {
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        isAuthenticated: false,
        isMember: false,
        isAdmin: false,
        isLeader: false
      })
      return
    }

    const profile = await fetchProfile(session.user.id)
    
    setState({
      user: session.user,
      profile,
      session,
      loading: false,
      isAuthenticated: true,
      isMember: profile?.role ? ['member', 'vice-leader', 'leader', 'admin'].includes(profile.role) : false,
      isAdmin: profile?.role ? ['vice-leader', 'leader', 'admin'].includes(profile.role) : false,
      isLeader: profile?.role ? ['leader', 'admin'].includes(profile.role) : false
    })
  }, [fetchProfile])

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateAuthState(session)
    })

    // Listen for auth changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event)
      updateAuthState(session)

      // Handle specific events
      // Skip toast on initial load or when event is INITIAL_SESSION
      if (event === 'SIGNED_IN' && !isInitialLoad) {
        toast.success('로그인되었습니다.')
      } else if (event === 'SIGNED_OUT') {
        toast.success('로그아웃되었습니다.')
        // Clear all auth-related caches
        HybridCache.invalidate('auth:profile')
        router.push('/')
      } else if (event === 'USER_UPDATED') {
        toast.success('사용자 정보가 업데이트되었습니다.')
      }
      
      // Set initial load to false after first auth state change
      if (isInitialLoad && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setIsInitialLoad(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateAuthState, router])

  // Subscribe to profile changes
  useEffect(() => {
    if (!state.user) return

    // Subscribe to realtime changes for the user's profile
    const subscription = supabase
      .channel(`profile_${state.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${state.user.id}`
        },
        async (payload) => {
          console.log('Profile changed:', payload)
          
          if (!state.user) return
          
          // Invalidate cache
          const cacheKey = createCacheKey('auth', 'profile', state.user.id)
          HybridCache.invalidate(cacheKey)
          
          // Refetch profile
          const profile = await fetchProfile(state.user.id)
          setState(prev => ({ 
            ...prev, 
            profile,
            isMember: profile?.role ? ['member', 'vice-leader', 'leader', 'admin'].includes(profile.role) : false,
            isAdmin: profile?.role ? ['vice-leader', 'leader', 'admin'].includes(profile.role) : false,
            isLeader: profile?.role ? ['leader', 'admin'].includes(profile.role) : false
          }))
          
          toast.success('프로필이 업데이트되었습니다.')
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [state.user, fetchProfile])

  // Sign in method
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      toast.error(handleSupabaseError(error))
    }

    return { error }
  }, [])

  // Sign up method
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    department?: string
  ) => {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          department
        }
      }
    })

    if (authError) {
      toast.error(handleSupabaseError(authError))
      return { error: authError }
    }

    // 2. Create user profile (will be handled by trigger in DB)
    // The database trigger automatically creates a user profile with 'guest' role

    toast.success('회원가입이 완료되었습니다. 이메일을 확인해주세요.')
    return { error: null }
  }, [])

  // Sign out method
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(handleSupabaseError(error))
    }
  }, [])

  // Refresh session
  const refreshSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      toast.error('세션 갱신에 실패했습니다.')
      return
    }
    updateAuthState(session)
  }, [updateAuthState])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!state.user) {
      return { error: new Error('Not authenticated') }
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', state.user.id)

    if (error) {
      toast.error(handleSupabaseError(error))
      return { error }
    }

    // Invalidate cache and refresh profile
    const cacheKey = createCacheKey('auth', 'profile', state.user.id)
    HybridCache.invalidate(cacheKey)
    
    const profile = await fetchProfile(state.user.id)
    setState(prev => ({ ...prev, profile }))

    toast.success('프로필이 업데이트되었습니다.')
    return { error: null }
  }, [state.user, fetchProfile])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Convenience hooks
export function useUser() {
  const { user } = useAuth()
  return user
}

export function useProfile() {
  const { profile } = useAuth()
  return profile
}

export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

export function useIsMember() {
  const { isMember } = useAuth()
  return isMember
}

export function useIsAdmin() {
  const { isAdmin } = useAuth()
  return isAdmin
}

// Auth guard component
interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireMember?: boolean
  requireAdmin?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = false,
  requireMember = false,
  requireAdmin = false,
  fallback = null
}: AuthGuardProps) {
  const { isAuthenticated, isMember, isAdmin, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (requireAdmin && !isAdmin) {
    return <>{fallback}</>
  }

  if (requireMember && !isMember) {
    return <>{fallback}</>
  }

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}