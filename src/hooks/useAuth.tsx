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
  signOut: () => Promise<{ error: any } | undefined>
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
  const [profileSubscription, setProfileSubscription] = useState<any>(null)

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
      // Don't show toast for SIGNED_IN - let the component handle it
      if (event === 'SIGNED_OUT') {
        toast.success('로그아웃되었습니다.')
        // Ensure state is cleared
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
        // Clear all auth-related caches
        HybridCache.invalidate('auth:')
        // Delay navigation to ensure state updates propagate
        setTimeout(() => {
          router.push('/')
        }, 100)
      } else if (event === 'USER_UPDATED') {
        toast.success('사용자 정보가 업데이트되었습니다.')
      } else if (event === 'SIGNED_IN' && session?.user) {
        // 로그인 성공 시 알림 권한 요청 (멤버인 경우만)
        const profile = await fetchProfile(session.user.id)
        const isMemberRole = profile?.role ? ['member', 'vice-leader', 'leader', 'admin'].includes(profile.role) : false
        
        if (isMemberRole) {
          // 5초 후에 알림 권한 요청 (사용자 경험 고려)
          setTimeout(async () => {
            const { MessageNotifications } = await import('@/lib/api/messages')
            const status = MessageNotifications.getNotificationStatus()
            
            if (status.supported && status.permission === 'default') {
              const granted = await MessageNotifications.requestNotificationPermission()
              if (granted) {
                toast.success('메시지 알림이 활성화되었습니다.')
              }
            }
          }, 5000)
        }
      }
      
      // Set initial load to false after first auth state change
      if (isInitialLoad && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setIsInitialLoad(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateAuthState, router, fetchProfile])

  // Subscribe to profile changes
  useEffect(() => {
    if (!state.user) {
      // Clean up subscription if user logs out
      if (profileSubscription) {
        profileSubscription.unsubscribe()
        setProfileSubscription(null)
      }
      return
    }

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
      
    setProfileSubscription(subscription)

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

    // Don't show toast here - let the component handle it
    return { error }
  }, [])

  // Sign up method
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    department?: string
  ) => {
    // First check if user exists in public.users (verified users)
    const { data: publicUser, error: publicError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()  // Use maybeSingle() instead of single() to avoid error when no record found

    if (publicUser) {
      // User is fully registered and verified
      return { 
        error: {
          message: 'User already exists',
          status: 400,
          code: 'user_already_exists'
        } as any
      }
    }

    // Try to sign up - this will fail if user exists in auth.users
    const { error: authError } = await supabase.auth.signUp({
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
      // Check if it's a "User already registered" error
      if (authError.message?.includes('User already registered')) {
        // User exists in auth but not verified
        return { 
          error: {
            message: 'Email not verified',
            status: 400,
            code: 'email_not_verified'
          } as any
        }
      }
      // Return other errors as-is
      return { error: authError }
    }

    // Don't show toast here - let the component handle it
    return { error: null }
  }, [])

  // Sign out method
  const signOut = useCallback(async () => {
    try {
      // Clear all caches first
      HybridCache.invalidate('auth:')
      
      // Clear localStorage session manually as backup
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kepco-ai-auth')
      }
      
      // Unsubscribe from realtime
      if (profileSubscription) {
        await profileSubscription.unsubscribe()
        setProfileSubscription(null)
      }
      
      // Remove all active channels
      const channels = supabase.getChannels()
      await Promise.all(channels.map(channel => supabase.removeChannel(channel)))
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast.error(handleSupabaseError(error))
        return { error }
      }
      
      // Clear state immediately
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
      
      return { error: null }
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('로그아웃 중 오류가 발생했습니다.')
      return { error }
    }
  }, [profileSubscription])

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