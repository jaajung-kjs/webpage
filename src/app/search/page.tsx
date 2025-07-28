'use client'

import { Suspense } from 'react'
import SearchPage from '@/components/search/SearchPage'

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPage />
    </Suspense>
  )
}