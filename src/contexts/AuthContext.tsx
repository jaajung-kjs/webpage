/**
 * AuthContext - Legacy compatibility layer
 * 
 * This file re-exports the new auth hooks for backward compatibility
 * All new code should import directly from @/hooks/useAuth
 */

'use client'

export { 
  useAuth, 
  AuthProvider,
  useUser,
  useProfile,
  useIsAuthenticated,
  useIsMember,
  useIsAdmin,
  AuthGuard
} from '@/hooks/useAuth'

// Re-export for backward compatibility
import { useAuth as useAuthHook } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useCallback } from 'react'

// Extended auth hook with legacy methods
export function useAuthLegacy() {
  const auth = useAuthHook()
  
  // Add resendEmailConfirmation for backward compatibility
  const resendEmailConfirmation = useCallback(async (email: string) => {
    try {
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
  }, [])
  
  return {
    ...auth,
    resendEmailConfirmation
  }
}