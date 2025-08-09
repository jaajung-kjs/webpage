'use client'
import MainLayout from '@/components/layout/MainLayout'
import ResourceDetailPage from '@/components/resources/ResourceDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default async function ResourceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <ResourceDetailPage resourceId={id} />
      </PermissionGate>
    </MainLayout>
  )
}