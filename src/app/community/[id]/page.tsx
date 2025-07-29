import MainLayout from '@/components/layout/MainLayout'
import CommunityDetailPage from '@/components/community/CommunityDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default async function CommunityDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <CommunityDetailPage postId={id} />
      </PermissionGate>
    </MainLayout>
  )
}