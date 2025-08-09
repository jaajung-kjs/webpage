'use client'

import dynamicImport from 'next/dynamic'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

const AnnouncementsPage = dynamicImport(
  () => import('@/components/announcements/AnnouncementsPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: false
  }
)

export default function Announcements() {
  return (
    <MainLayout>
      <AnnouncementsPage />
    </MainLayout>
  )
}