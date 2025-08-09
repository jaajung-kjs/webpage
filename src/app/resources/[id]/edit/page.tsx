'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('resources')

export default async function ResourceEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="resource"
        title="학습자료 수정"
        description="학습자료를 수정합니다"
        categories={categories}
        backLink={`/resources/${id}`}
        editId={id}
      />
    </MainLayout>
  )
}