import MainLayout from '@/components/layout/MainLayout'
import ResourceDetailPage from '@/components/resources/ResourceDetailPage'

export default async function ResourceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <ResourceDetailPage resourceId={id} />
    </MainLayout>
  )
}