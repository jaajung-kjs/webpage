import MainLayout from '@/components/layout/MainLayout'
import AdminDashboard from '@/components/admin/AdminDashboard'

export const metadata = {
  title: '관리자 대시보드 | KEPCO AI Community',
  description: '동아리 관리자 전용 대시보드',
}

export default function AdminPage() {
  return (
    <MainLayout>
      <AdminDashboard />
    </MainLayout>
  )
}