'use client'

import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

const CommunityPage = dynamicImport(
  () => import('@/components/community/CommunityPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false
  }
)

export default function Community() {
  return (
    <MainLayout>
      <CommunityPage />
    </MainLayout>
  )
}