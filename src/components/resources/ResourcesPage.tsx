'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { toast } from 'sonner'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { getBoardCategoryData } from '@/lib/categories'
import { 
  Plus,
  Download,
  Eye,
  BookOpen,
  TrendingUp,
  Users,
  FileText
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'

// 카테고리 정보 가져오기
const { categoryLabels, categoryColors, categoryIcons } = getBoardCategoryData('resources')

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'downloads', label: '다운로드순' }
]

export default function ResourcesPage() {
  const router = useRouter()
  const { user, isMember } = useAuthV2()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  
  const { 
    data: resourcesData, 
    isPending: loading,
    refetch
  } = contentV2.useInfiniteContents(
    { type: 'resource' },
    sortBy === 'latest' ? 'created_at' : 
    sortBy === 'popular' ? 'like_count' : 
    sortBy === 'views' ? 'view_count' : 'created_at',
    'desc',
    50
  )
  
  const resources = resourcesData?.pages.flatMap(page => page.contents) || []

  // Filter and sort resources
  const filteredResources = useMemo(() => {
    if (!resources) return []
    
    let filtered = [...resources]
    
    // Category filter - V2에서는 categories 관계 사용
    if (activeCategory !== 'all') {
      filtered = filtered.filter(resource => 
        (resource as any)?.categories?.some((cat: any) => cat.slug === activeCategory)
      )
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(resource => 
        resource.title?.toLowerCase().includes(searchLower) ||
        resource.content?.toLowerCase().includes(searchLower) ||
        resource.author?.name?.toLowerCase().includes(searchLower) ||
        resource.tags?.some((tag: any) => tag.name?.toLowerCase().includes(searchLower) || tag.slug?.toLowerCase().includes(searchLower))
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
          return ((b as any)?.interaction_counts?.downloads || 0) - ((a as any)?.interaction_counts?.downloads || 0)
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
    totalDownloads: resources?.reduce((sum, r) => sum + ((r as any)?.interaction_counts?.downloads || 0), 0) || 0
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 자료를 삭제하시겠습니까?')) {
      return
    }
    
    try {
      await contentV2.deleteContentAsync(id)
      toast.success('자료가 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      toast.error(error.message || '자료 삭제에 실패했습니다.')
    }
  }

  // Check permissions - V2에서는 user만 사용 (역할은 별도 처리)
  const canEdit = (item: any) => {
    return !!(user && (user as any)?.id === item.author_id)
  }

  const canDelete = (item: any) => {
    return !!(user && (user as any)?.id === item.author_id)
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
        title={
          <span className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            학습자료
          </span>
        }
        description={
          <span className="font-semibold">동아리원들이 공유한 유용한 자료들을 확인해보세요</span>
        }
        searchPlaceholder="제목, 내용, 태그로 검색"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="자료 공유하기"
        onCreateClick={() => router.push('/resources/new')}
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
          (user ? (
            <Button 
              className="kepco-gradient" 
              onClick={() => router.push('/resources/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 자료를 공유해보세요!
            </Button>
          ) : null) as React.ReactNode
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
                onEdit={() => router.push(`/resources/${resource.id}/edit`)}
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
    </>
  )
}