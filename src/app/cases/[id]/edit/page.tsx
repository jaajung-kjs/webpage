'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('cases')

export default async function CaseEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="case"
        title="AI 활용사례 수정"
        description="활용사례를 수정합니다"
        categories={categories}
        backLink={`/cases/${id}`}
        editId={id}
      />
    </MainLayout>
  )
}