'use client'

export const dynamic = 'force-dynamic'

import dynamicImport from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

// Dynamic import for better performance
const MembersPage = dynamicImport(
  () => import('@/components/members/MembersPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false
  }
)

export default function Members() {
  return (
    <MainLayout>
      <MembersPage />
    </MainLayout>
  )
}