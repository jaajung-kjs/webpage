'use client'

import { useState, useMemo } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useContentList, useCreateContent, useDeleteContent } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { Views, TablesInsert } from '@/lib/supabase/client'
import * as z from 'zod'
import { 
  Plus,
  FileText,
  BookOpen,
  Video,
  Link,
  Download,
  Eye
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import ContentCreateModal from '@/components/shared/ContentCreateModal'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'

const categoryLabels = {
  all: '전체',
  document: '문서',
  video: '영상',
  link: '링크',
  tool: '도구',
  template: '템플릿'
}

const categoryColors = {
  document: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  video: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  link: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  tool: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  template: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
}

const categoryIcons = {
  document: FileText,
  video: Video,
  link: Link,
  tool: BookOpen,
  template: FileText
}

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'downloads', label: '다운로드순' }
]

// Form fields for create modal
const createFields = [
  {
    name: 'category',
    label: '카테고리',
    type: 'select' as const,
    placeholder: '카테고리를 선택해주세요',
    options: Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['document', 'video', 'link', 'tool', 'template'], {
      message: '카테고리를 선택해주세요',
    })
  },
  {
    name: 'title',
    label: '제목',
    type: 'text' as const,
    placeholder: '자료 제목을 입력하세요',
    maxLength: 100,
    validation: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다')
  },
  {
    name: 'content',
    label: '설명',
    type: 'textarea' as const,
    placeholder: '자료에 대한 설명을 입력하세요',
    rows: 8,
    maxLength: 3000,
    validation: z.string().min(1, '설명을 입력해주세요').max(3000, '설명은 3000자 이하여야 합니다')
  },
  {
    name: 'tags',
    label: '태그',
    type: 'tags' as const,
    placeholder: '관련 키워드를 입력하고 Enter를 누르세요',
    description: '자료와 관련된 키워드를 추가하세요 (선택사항)',
    validation: z.array(z.string()).optional()
  }
]

export default function ResourcesPage() {
  const { user, profile } = useOptimizedAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  // viewMode is now handled by ContentListLayout's autoResponsiveViewMode
  const [createModalOpen, setCreateModalOpen] = useState(false)
  
  // Use Supabase hooks
  const { data: resources, loading, refetch } = useContentList({
    type: 'resource',
    status: 'published'
  })
  const { createContent, loading: createLoading } = useCreateContent()
  const { deleteContent } = useDeleteContent()

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    if (!resources) return []
    
    let filtered = [...resources]
    
    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(resource => resource.category === activeCategory)
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(resource => 
        resource.title?.toLowerCase().includes(searchLower) ||
        resource.content?.toLowerCase().includes(searchLower) ||
        resource.author_name?.toLowerCase().includes(searchLower) ||
        resource.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.like_count || 0) - (a.like_count || 0)
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'downloads':
          return ((b.metadata as any)?.downloads || 0) - ((a.metadata as any)?.downloads || 0)
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      }
    })
    
    return filtered
  }, [resources, activeCategory, searchTerm, sortBy])

  const stats = {
    totalResources: resources?.length || 0,
    todayResources: resources?.filter(r => {
      const resourceDate = new Date(r.created_at || '')
      const today = new Date()
      return resourceDate.toDateString() === today.toDateString()
    }).length || 0,
    totalViews: resources?.reduce((sum, r) => sum + (r.view_count || 0), 0) || 0,
    totalDownloads: resources?.reduce((sum, r) => sum + ((r.metadata as any)?.downloads || 0), 0) || 0
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 자료를 삭제하시겠습니까?')) {
      return
    }
    
    try {
      const result = await deleteContent(id)
      if (result.error) {
        throw result.error
      }
      toast.success('자료가 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      toast.error(error.message || '자료 삭제에 실패했습니다.')
    }
  }

  // Handle create
  const handleCreate = async (values: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const newResource: TablesInsert<'content'> = {
        type: 'resource',
        title: values.title.trim(),
        content: values.content.trim(),
        category: values.category,
        tags: values.tags || [],
        author_id: user.id,
        status: 'published',
        metadata: {
          downloads: 0
        }
      }

      const result = await createContent(newResource)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success('자료가 등록되었습니다.')
      setCreateModalOpen(false)
      refetch()
    } catch (error: any) {
      console.error('Error creating resource:', error)
      toast.error(error.message || '자료 등록에 실패했습니다.')
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

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="전체 자료"
        value={stats.totalResources}
        icon={BookOpen}
        subtitle={`오늘 +${stats.todayResources}`}
        loading={loading}
      />
      <StatsCard
        title="전체 조회수"
        value={stats.totalViews.toLocaleString()}
        icon={Eye}
        loading={loading}
      />
      <StatsCard
        title="전체 다운로드"
        value={stats.totalDownloads.toLocaleString()}
        icon={Download}
        loading={loading}
      />
      <StatsCard
        title="인기 자료"
        value={loading ? 0 : resources?.filter(r => (r.like_count || 0) > 5).length || 0}
        icon={FileText}
        loading={loading}
      />
    </div>
  )

  return (
    <>
      <ContentListLayout
        title="자료실"
        description="동아리원들이 공유한 유용한 자료들을 확인해보세요"
        searchPlaceholder="제목, 내용, 태그로 검색"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="자료 공유하기"
        onCreateClick={() => setCreateModalOpen(true)}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortOptions={sortOptions}
        activeSortBy={sortBy}
        onSortChange={setSortBy}
        autoResponsiveViewMode={true}
        showViewToggle={false}
        statsSection={statsSection}
        loading={loading}
        resultCount={filteredResources.length}
        emptyMessage="자료가 없습니다."
        emptyAction={
          user && (
            <Button 
              className="kepco-gradient" 
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 자료를 공유해보세요!
            </Button>
          )
        }
      >
        {(currentViewMode) => (
          <div className={currentViewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {filteredResources.map((resource, index) => (
              <ContentCard
                key={resource.id}
                content={resource}
                viewMode={currentViewMode}
                categoryLabels={categoryLabels}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
                onEdit={() => toast.info('수정 기능은 준비 중입니다.')}
                onDelete={handleDelete}
                canEdit={canEdit(resource)}
                canDelete={canDelete(resource)}
                linkPrefix="/resources"
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
        title="새 자료 공유"
        description="동아리원들과 유용한 자료를 공유해주세요"
        fields={createFields}
        onSubmit={handleCreate}
        loading={createLoading}
        contentType="resource"
      />
    </>
  )
}