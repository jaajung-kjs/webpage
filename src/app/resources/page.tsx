'use client'

export const dynamic = 'force-dynamic'

import MainLayout from '@/components/layout/MainLayout'
import ResourcesPage from '@/components/resources/ResourcesPage'

export default function Resources() {
  return (
    <MainLayout>
      <ResourcesPage />
    </MainLayout>
  )
}