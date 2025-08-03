'use client'

import { useState, useMemo } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { toast } from 'sonner'
import { 
  useContentList, 
  useCreateContent, 
  useUpdateContent,
  useDeleteContent
} from '@/hooks/useSupabase'
import { Views, TablesInsert, TablesUpdate } from '@/lib/supabase/client'
import * as z from 'zod'
import { 
  Plus,
  BookOpen, 
  Video, 
  Bot,
  FileText,
  Lightbulb,
  Cpu
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import ContentCreateModal from '@/components/shared/ContentCreateModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const categoryLabels = {
  all: '전체',
  tutorial: '튜토리얼',
  workshop: '워크샵 자료',
  template: '템플릿',
  reference: '참고자료',
  guideline: '가이드라인'
}

const typeIcons = {
  guide: BookOpen,
  presentation: FileText,
  video: Video,
  document: FileText,
  spreadsheet: FileText,
  template: Lightbulb
}

import React from 'react'

const categoryColors = {
  tutorial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  workshop: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  template: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  reference: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  guideline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

const categoryIcons = {
  tutorial: BookOpen,
  workshop: FileText,
  template: Lightbulb,
  reference: FileText,
  guideline: FileText
}

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'downloads', label: '다운로드순' },
  { value: 'views', label: '조회순' }
]

// Form fields for create modal
const createFields = [
  {
    name: 'title',
    label: '제목',
    type: 'text' as const,
    placeholder: '학습자료 제목을 입력하세요',
    maxLength: 100,
    validation: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다')
  },
  {
    name: 'category',
    label: '카테고리',
    type: 'select' as const,
    placeholder: '카테고리를 선택해주세요',
    options: Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['tutorial', 'workshop', 'template', 'reference', 'guideline'], {
      message: '카테고리를 선택해주세요',
    })
  },
  {
    name: 'type',
    label: '자료 유형',
    type: 'select' as const,
    placeholder: '자료 유형을 선택해주세요',
    options: [
      { value: 'guide', label: '가이드' },
      { value: 'presentation', label: '프레젠테이션' },
      { value: 'video', label: '영상' },
      { value: 'document', label: '문서' },
      { value: 'spreadsheet', label: '스프레드시트' },
      { value: 'template', label: '템플릿' }
    ],
    validation: z.enum(['guide', 'presentation', 'video', 'document', 'spreadsheet', 'template'], {
      message: '자료 유형을 선택해주세요',
    })
  },
  {
    name: 'url',
    label: 'URL',
    type: 'text' as const,
    placeholder: 'https://...',
    validation: z.string().min(1, 'URL을 입력해주세요').url('올바른 URL 형식이 아닙니다')
  },
  {
    name: 'description',
    label: '설명',
    type: 'textarea' as const,
    placeholder: '학습자료에 대한 자세한 설명을 입력하세요',
    rows: 4,
    validation: z.string().min(1, '설명을 입력해주세요')
  },
  {
    name: 'tags',
    label: '태그',
    type: 'tags' as const,
    placeholder: '태그를 입력하고 Enter를 누르세요',
    description: '관련 키워드를 태그로 추가하세요 (선택사항)',
    validation: z.array(z.string()).optional()
  }
]

export default function ResourcesPage() {
  const { user, profile } = useOptimizedAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Views<'content_with_author'> | null>(null)
  
  // Use Supabase hooks
  const { data: resources, loading, refetch } = useContentList({
    type: 'resource',
    status: 'published'
  })
  const { createContent, loading: createLoading } = useCreateContent()
  const { updateContent, loading: updateLoading } = useUpdateContent()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  
  const operationLoading = createLoading || updateLoading || deleteLoading

  // Filter resources
  const filteredResources = useMemo(() => {
    if (!resources) return []
    
    let filtered = [...resources]

    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (activeCategory !== 'all') {
      filtered = filtered.filter(resource => resource.category === activeCategory)
    }

    // Sorting
    filtered.sort((a, b) => {
      const aMetadata = a.metadata as any
      const bMetadata = b.metadata as any
      
      switch (sortBy) {
        case 'downloads':
          return (bMetadata?.downloads || 0) - (aMetadata?.downloads || 0)
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      }
    })

    return filtered
  }, [resources, searchTerm, activeCategory, sortBy])


  // Handle create
  const handleCreate = async (values: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const newResource: TablesInsert<'content'> = {
        title: values.title,
        content: values.description,
        type: 'resource',
        category: values.category,
        tags: values.tags || [],
        author_id: user.id,
        status: 'published',
        metadata: {
          url: values.url,
          type: values.type,
          downloads: 0
        }
      }
      
      const result = await createContent(newResource)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success('학습자료가 성공적으로 등록되었습니다.')
      setCreateModalOpen(false)
      refetch()
    } catch (error: any) {
      console.error('Error creating resource:', error)
      toast.error(error.message || '학습자료 등록에 실패했습니다.')
    }
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 학습자료를 삭제하시겠습니까?')) {
      return
    }

    try {
      const result = await deleteContent(id)

      if (result.error) {
        throw result.error
      }

      toast.success('학습자료가 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      toast.error(error.message || '학습자료 삭제에 실패했습니다.')
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

  // Quick Links Section
  const quickLinksSection = (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex flex-col items-center p-6">
          <Bot className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-sm">AI 도구</h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            ChatGPT, Claude 등
          </p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex flex-col items-center p-6">
          <Lightbulb className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-sm">프롬프트</h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            효과적인 작성법
          </p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex flex-col items-center p-6">
          <Cpu className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-sm">개발도구</h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Copilot, 코딩 AI
          </p>
        </CardContent>
      </Card>
      
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex flex-col items-center p-6">
          <FileText className="h-8 w-8 text-primary mb-2" />
          <h3 className="font-semibold text-sm">업무활용</h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            실무 적용 사례
          </p>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <>
      <ContentListLayout
        title="학습자료"
        description="AI 도구 활용을 위한 다양한 학습자료와 가이드를 제공합니다"
        searchPlaceholder="자료 제목, 내용, 태그로 검색..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="자료 등록하기"
        onCreateClick={() => setCreateModalOpen(true)}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortOptions={sortOptions}
        activeSortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        statsSection={quickLinksSection}
        loading={loading}
        resultCount={filteredResources.length}
        emptyMessage="학습자료가 없습니다."
        emptyAction={
          user && (
            <Button 
              className="kepco-gradient" 
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 학습자료를 등록해보세요!
            </Button>
          )
        }
      >
        <div className={viewMode === 'grid' 
          ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
          : "space-y-4"
        }>
          {filteredResources.map((resource, index) => {
            const metadata = resource.metadata as any
            return (
              <ContentCard
                key={resource.id}
                content={resource}
                viewMode={viewMode}
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
            )
          })}
        </div>
      </ContentListLayout>

      {/* Create Modal */}
      <ContentCreateModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="새 학습자료 등록"
        description="동아리 구성원들을 위한 학습자료를 등록해주세요"
        fields={createFields}
        onSubmit={handleCreate}
        loading={operationLoading}
        contentType="resource"
      />
    </>
  )
}