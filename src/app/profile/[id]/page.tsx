'use client'

import { use } from 'react'
import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

// Dynamic import for better performance - 통합된 프로필 페이지 사용
const UnifiedProfilePage = dynamicImport(
  () => import('@/components/profile/UnifiedProfilePage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false
  }
)

export default function ProfileDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  
  return (
    <MainLayout>
      <UnifiedProfilePage userId={resolvedParams.id} />
    </MainLayout>
  )
}