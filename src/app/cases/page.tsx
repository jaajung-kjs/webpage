'use client'

export const dynamic = 'force-dynamic'

import MainLayout from '@/components/layout/MainLayout'
import CasesListPage from '@/components/cases/CasesListPage'

export default function CasesPage() {
  return (
    <MainLayout>
      <CasesListPage />
    </MainLayout>
  )
}