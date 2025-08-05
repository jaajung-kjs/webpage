import MainLayout from '@/components/layout/MainLayout'
import CommunityEditPage from '@/components/community/CommunityEditPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default async function CommunityEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <CommunityEditPage postId={id} />
      </PermissionGate>
    </MainLayout>
  )
}