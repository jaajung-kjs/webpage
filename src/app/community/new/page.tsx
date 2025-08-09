'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('community')

export default function CommunityNewPage() {
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="post"
        title="자유게시판 글쓰기"
        description="동아리원들과 자유롭게 소통해보세요"
        categories={categories}
        backLink="/community"
      />
    </MainLayout>
  )
}