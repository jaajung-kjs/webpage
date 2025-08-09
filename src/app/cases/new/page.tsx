'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('cases')

export default function CaseNewPage() {
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="case"
        title="AI 활용사례 작성"
        description="AI를 활용한 성공사례를 공유해주세요"
        categories={categories}
        backLink="/cases"
      />
    </MainLayout>
  )
}