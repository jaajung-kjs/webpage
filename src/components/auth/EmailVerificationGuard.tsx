'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface EmailVerificationGuardProps {
  children: React.ReactNode
}

export default function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로딩 중이거나 사용자가 없으면 아무것도 하지 않음
    if (loading || !user) return

    // 이메일 인증이 안된 경우 인증 페이지로 리다이렉트
    if (!user.email_confirmed_at) {
      router.push('/auth/verify-email')
    }
  }, [user, loading, router])

  // 로딩 중이거나 사용자가 없거나 이메일 인증이 안된 경우 children을 렌더링하지 않음
  if (loading || !user || !user.email_confirmed_at) {
    return null
  }

  return <>{children}</>
}