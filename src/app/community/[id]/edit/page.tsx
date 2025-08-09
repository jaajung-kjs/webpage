'use client'
import MainLayout from '@/components/layout/MainLayout'
import ContentEditorPage from '@/components/shared/ContentEditorPage'
import { getCategoriesForSelect } from '@/lib/categories'

const categories = getCategoriesForSelect('community')

export default async function CommunityEditRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <MainLayout>
      <ContentEditorPage
        contentType="post"
        title="자유게시판 글 수정"
        description="게시글을 수정합니다"
        categories={categories}
        backLink={`/community/${id}`}
        editId={id}
      />
    </MainLayout>
  )
}