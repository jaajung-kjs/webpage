'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabaseSimple } from '@/lib/supabase-simple'
import { AuthUser, getCurrentUser, clearUserCache } from '@/lib/auth'
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>
  signUp: (email: string, password: string, name: string, department?: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
  updateProfile: (updates: Partial<any>) => Promise<{ data: any; error: any }>
  resendEmailConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with timeout
    const timeout = setTimeout(() => {
      console.warn('Auth initialization timeout')
      setLoading(false)
    }, 5000) // 5초 타임아웃

    getCurrentUser()
      .then((user) => {
        clearTimeout(timeout)
        setUser(user)
        setLoading(false)
      })
      .catch((error) => {
        clearTimeout(timeout)
        console.error('Auth initialization error:', error)
        setLoading(false)
      })

    // Listen for auth changes
    if (!supabaseSimple) {
      setLoading(false)
      return
    }
    
    const { data: { subscription } } = supabaseSimple.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change', session?.user?.id, { event, emailConfirmed: session?.user?.email_confirmed_at })
        
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
          return
        }
        
        // Only fetch user profile when necessary
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          const currentUser = await getCurrentUser(true) // Force refresh for these events
          setUser(currentUser)
          console.log('User profile updated', currentUser?.id, { emailConfirmed: currentUser?.emailConfirmed })
        } else if (event === 'TOKEN_REFRESHED' && !user) {
          const currentUser = await getCurrentUser(false) // Use cache if available
          setUser(currentUser)
        } else if (session?.user && !user) {
          // Only fetch if we don't already have user data
          const currentUser = await getCurrentUser(false) // Use cache if available
          setUser(currentUser)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { signIn } = await import('@/lib/auth')
    return signIn(email, password)
  }, [])

  const signUp = useCallback(async (email: string, password: string, name: string, department?: string) => {
    const { signUp } = await import('@/lib/auth')
    return signUp(email, password, name, department)
  }, [])

  const signOut = useCallback(async () => {
    const { signOut } = await import('@/lib/auth')
    const result = await signOut()
    if (!result.error) {
      setUser(null)
      clearUserCache() // Clear cache on sign out
    }
    return result
  }, [])

  const updateProfile = useCallback(async (updates: Partial<any>) => {
    if (!user) return { data: null, error: 'No user logged in' }
    
    const { updateProfile } = await import('@/lib/auth')
    const result = await updateProfile(user.id, updates)
    
    if (result.data && user) {
      setUser({
        ...user,
        profile: result.data,
      })
    }
    
    return result
  }, [user])

  const resendEmailConfirmation = useCallback(async (email: string) => {
    try {
      if (!supabaseSimple) {
        return { error: new Error('Supabase client not available') }
      }
      
      const { error } = await supabaseSimple.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      return { error }
    } catch (error: any) {
      return { error }
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation,
  }), [user, loading, signIn, signUp, signOut, updateProfile, resendEmailConfirmation])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}