'use client'

import dynamicImport from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

export const dynamic = 'force-dynamic'

const ActivitiesPage = dynamicImport(
  () => import('@/components/activities/ActivitiesPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false
  }
)

export default function Activities() {
  return (
    <MainLayout>
      <ActivitiesPage />
    </MainLayout>
  )
}