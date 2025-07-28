import MainLayout from '@/components/layout/MainLayout'
import CommunityDetailPage from '@/components/community/CommunityDetailPage'

export default async function CommunityDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <CommunityDetailPage postId={id} />
    </MainLayout>
  )
}