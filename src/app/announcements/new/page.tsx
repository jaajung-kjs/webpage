import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('announcements')

export default function AnnouncementNewPage() {
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="announcement"
        title="공지사항 작성"
        description="동아리 공지사항을 작성해주세요"
        categories={categories}
        backLink="/announcements"
      />
    </MainLayout>
  )
}