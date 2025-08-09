'use client'
import MainLayout from '@/components/layout/MainLayout'
import AnnouncementDetailPage from '@/components/announcements/AnnouncementDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default async function AnnouncementDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <AnnouncementDetailPage announcementId={id} />
      </PermissionGate>
    </MainLayout>
  )
}