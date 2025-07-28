import MainLayout from '@/components/layout/MainLayout'
import AnnouncementDetailPage from '@/components/announcements/AnnouncementDetailPage'

export default async function AnnouncementDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <AnnouncementDetailPage announcementId={id} />
    </MainLayout>
  )
}