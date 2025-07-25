'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthUser, getCurrentUser } from '@/lib/auth'
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
    // Get initial session
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    if (!supabase) {
      setLoading(false)
      return
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email_confirmed_at)
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
          console.log('User updated:', currentUser?.emailConfirmed)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (session?.user) {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { signIn } = await import('@/lib/auth')
    return signIn(email, password)
  }

  const signUp = async (email: string, password: string, name: string, department?: string) => {
    const { signUp } = await import('@/lib/auth')
    return signUp(email, password, name, department)
  }

  const signOut = async () => {
    const { signOut } = await import('@/lib/auth')
    const result = await signOut()
    if (!result.error) {
      setUser(null)
    }
    return result
  }

  const updateProfile = async (updates: Partial<any>) => {
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
  }

  const resendEmailConfirmation = async (email: string) => {
    try {
      if (!supabase) {
        return { error: new Error('Supabase client not available') }
      }
      
      const { error } = await supabase.auth.resend({
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
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendEmailConfirmation,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}