import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'
import PermissionGate from '@/components/shared/PermissionGate'

// Dynamic import for better performance
const ProfileDetailPage = dynamic(
  () => import('@/components/profile/ProfileDetailPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default async function ProfileDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <ProfileDetailPage userId={resolvedParams.id} />
      </PermissionGate>
    </MainLayout>
  )
}