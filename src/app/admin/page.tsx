'use client'

import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const dynamic = 'force-dynamic'

export default function AdminPage() {
  return (
    <MainLayout>
      <AdminDashboard />
    </MainLayout>
  )
}