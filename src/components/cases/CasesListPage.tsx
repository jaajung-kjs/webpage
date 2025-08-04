'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useContentList, useDeleteContent } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { Views, type Enums } from '@/lib/supabase/client'
import { getBoardCategoryData } from '@/lib/categories'
import { Plus, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'

type PostCategory = Enums<'post_category'>

// 카테고리 정보 가져오기
const { categoryLabels, categoryColors, categoryIcons } = getBoardCategoryData('cases')

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'comments', label: '댓글순' }
]

export default function CasesListPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState('latest')
  
  const { user, profile } = useOptimizedAuth()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  
  // Use Supabase hook
  const { data: cases, loading, refetch } = useContentList({
    type: 'case',
    category: activeCategory !== 'all' ? activeCategory : undefined,
    status: 'published'
  })
  
  // Filter and sort cases
  const filteredCases = useMemo(() => {
    if (!cases) return []
    
    let filtered = [...cases]
    
    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(lowerSearch) ||
        item.content?.toLowerCase().includes(lowerSearch) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
      )
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.like_count || 0) - (a.like_count || 0)
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'comments':
          return (b.comment_count || 0) - (a.comment_count || 0)
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      }
    })
    
    return filtered
  }, [cases, searchTerm, sortBy])


  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 활용사례를 삭제하시겠습니까?')) {
      return
    }
    
    try {
      const result = await deleteContent(id)
      if (result.error) {
        throw result.error
      }
      toast.success('활용사례가 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting case:', error)
      toast.error(error.message || '활용사례 삭제에 실패했습니다.')
    }
  }

  // Check permissions
  const canEdit = (item: Views<'content_with_author'>) => {
    return !!(user && profile && item.author_id === user.id)
  }

  const canDelete = (item: Views<'content_with_author'>) => {
    return !!(user && profile && (
      profile.role === 'admin' || 
      profile.role === 'leader' || 
      profile.role === 'vice-leader' || 
      item.author_id === user.id
    ))
  }

  // Categories for tabs
  const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

  return (
    <>
      <ContentListLayout
        title="AI 활용사례"
        description={
          <span className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="font-semibold">동료들이 공유한 다양한 AI 활용 경험을 확인해보세요</span>
          </span>
        }
        searchPlaceholder="사례 제목, 내용, 태그로 검색..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="사례 공유하기"
        onCreateClick={() => router.push('/cases/new')}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(value) => setActiveCategory(value as PostCategory | 'all')}
        sortOptions={sortOptions}
        activeSortBy={sortBy}
        onSortChange={setSortBy}
        autoResponsiveViewMode={true}
        showViewToggle={false}
        loading={loading}
        resultCount={filteredCases.length}
        emptyMessage="검색 결과가 없습니다."
        emptyAction={
          user && (
            <Button 
              className="kepco-gradient" 
              onClick={() => router.push('/cases/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 사례를 공유해보세요!
            </Button>
          )
        }
      >
        {(currentViewMode) => (
          <div className={currentViewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {filteredCases.map((caseItem, index) => (
              <ContentCard
                key={caseItem.id}
                content={caseItem}
                viewMode={currentViewMode}
                categoryLabels={categoryLabels}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
                onEdit={() => toast.info('수정 기능은 준비 중입니다.')}
                onDelete={handleDelete}
                canEdit={canEdit(caseItem)}
                canDelete={canDelete(caseItem)}
                linkPrefix="/cases"
                index={index}
              />
            ))}
          </div>
        )}
      </ContentListLayout>
    </>
  )
}