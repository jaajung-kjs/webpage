'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import RPAListPage from '@/components/rpa/RPAListPage'
import { useAuth } from '@/providers'

export default function RPAPage() {
  const { user, profile, loading, isMember } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 로딩 중이 아니고, 사용자 정보가 로드된 후 권한 체크
    if (!loading) {
      if (!user || !isMember) {
        // 게스트나 비회원은 홈으로 리다이렉트
        router.push('/')
      }
    }
  }, [user, isMember, loading, router])

  // 로딩 중이거나 권한이 없으면 null 반환
  if (loading || !user || !isMember) {
    return null
  }

  return (
    <MainLayout>
      <RPAListPage />
    </MainLayout>
  )
}