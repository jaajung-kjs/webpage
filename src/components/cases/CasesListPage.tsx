'use client'

import { useState, useMemo } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useContentList, useDeleteContent, useCreateContent } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { Views, type Enums, TablesInsert } from '@/lib/supabase/client'
import * as z from 'zod'
import { Plus, BookOpen, Lightbulb, Cpu, ChartBar, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import ContentCreateModal from '@/components/shared/ContentCreateModal'

type PostCategory = Enums<'post_category'>

const categoryLabels = {
  all: '전체',
  productivity: '생산성 향상',
  creativity: '창의적 활용',
  development: '개발',
  analysis: '분석',
  other: '기타'
}

const categoryColors = {
  productivity: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  creativity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  development: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const categoryIcons = {
  productivity: Zap,
  creativity: Lightbulb,
  development: Cpu,
  analysis: ChartBar,
  other: BookOpen
}

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'comments', label: '댓글순' }
]

// Form fields for create modal
const createFields = [
  {
    name: 'title',
    label: '제목',
    type: 'text' as const,
    placeholder: '예: ChatGPT를 활용한 회의록 자동 작성',
    description: '어떤 AI 도구를 어떻게 활용했는지 명확하게 작성해주세요',
    maxLength: 100,
    validation: z.string().min(5, '제목은 최소 5자 이상이어야 합니다').max(100, '제목은 100자 이하여야 합니다')
  },
  {
    name: 'category',
    label: '카테고리',
    type: 'select' as const,
    placeholder: '카테고리를 선택해주세요',
    options: Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['productivity', 'creativity', 'development', 'analysis', 'other'], {
      message: '카테고리를 선택해주세요',
    })
  },
  {
    name: 'content',
    label: '본문',
    type: 'textarea' as const,
    placeholder: '구체적인 활용 방법, 프롬프트 예시, 효과 등을 자세히 작성해주세요',
    description: '다른 동료들이 따라할 수 있도록 구체적으로 작성해주세요',
    rows: 10,
    validation: z.string().min(50, '본문은 최소 50자 이상이어야 합니다')
  },
  {
    name: 'tags',
    label: '태그',
    type: 'tags' as const,
    placeholder: 'ChatGPT, 문서작성, 업무자동화 등',
    description: '관련 키워드를 입력하고 Enter를 누르세요',
    validation: z.array(z.string()).min(1, '최소 1개의 태그를 입력해주세요')
  }
]

export default function CasesListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState('latest')
  // viewMode is now handled by ContentListLayout's autoResponsiveViewMode
  const [createModalOpen, setCreateModalOpen] = useState(false)
  
  const { user, profile } = useOptimizedAuth()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  const { createContent, loading: createLoading } = useCreateContent()
  
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

  // Handle create
  const handleCreate = async (values: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const caseData: TablesInsert<'content'> = {
        title: values.title,
        content: values.content,
        type: 'case',
        category: values.category,
        tags: values.tags,
        author_id: user.id,
        status: 'published',
        metadata: {}
      }

      const result = await createContent(caseData)
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      toast.success('사례가 성공적으로 등록되었습니다.')
      setCreateModalOpen(false)
      refetch()
    } catch (error: any) {
      console.error('Error creating case:', error)
      toast.error(error.message || '사례 등록에 실패했습니다.')
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
        description="동료들이 공유한 다양한 AI 활용 경험을 확인해보세요"
        searchPlaceholder="사례 제목, 내용, 태그로 검색..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="사례 공유하기"
        onCreateClick={() => setCreateModalOpen(true)}
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
              onClick={() => setCreateModalOpen(true)}
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

      {/* Create Modal */}
      <ContentCreateModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="새로운 활용사례 공유"
        description="동료들과 AI 활용 경험을 공유해주세요"
        fields={createFields}
        onSubmit={handleCreate}
        loading={createLoading}
        contentType="case"
      />
    </>
  )
}