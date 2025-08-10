'use client'
import { use } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import AnnouncementDetailPage from '@/components/announcements/AnnouncementDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default function AnnouncementDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <AnnouncementDetailPage announcementId={id} />
      </PermissionGate>
    </MainLayout>
  )
}