'use client'

export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import SearchPage from '@/components/search/SearchPage'

export default function Page() {
  return (
    <MainLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <SearchPage />
      </Suspense>
    </MainLayout>
  )
}