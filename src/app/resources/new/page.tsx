'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

export const dynamic = 'force-dynamic'

const categories = getCategoriesForSelect('resources')

export default function ResourceNewPage() {
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="resource"
        title="학습자료 등록"
        description="AI 학습에 도움이 되는 자료를 공유해주세요"
        categories={categories}
        backLink="/resources"
      />
    </MainLayout>
  )
}