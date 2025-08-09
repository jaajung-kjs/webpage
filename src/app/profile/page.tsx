'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

export default function Profile() {
  const router = useRouter()
  const { user, loading } = useAuth()
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else {
        // 현재 사용자의 프로필 페이지로 리다이렉트
        router.push(`/profile/${user.id}`)
      }
    }
  }, [user, loading, router])
  
  // 리다이렉트 중 로딩 표시
  return (
    <MainLayout>
      <PageLoadingFallback />
    </MainLayout>
  )
}