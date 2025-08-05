import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import PermissionGate from '@/components/shared/PermissionGate'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('announcements')

export default async function AnnouncementEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireAdmin={true}>
        <ContentEditorPage
          contentType="announcement"
          title="공지사항 수정"
          description="공지사항을 수정합니다"
          categories={categories}
          backLink={`/announcements/${id}`}
          editId={id}
        />
      </PermissionGate>
    </MainLayout>
  )
}