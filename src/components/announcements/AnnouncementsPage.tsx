'use client'

import { useState, useMemo, useEffect } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { toast } from 'sonner'
import { ContentAPI } from '@/lib/api/content'
import { Views, TablesInsert } from '@/lib/supabase/client'
import * as z from 'zod'
import { 
  Plus,
  Bell,
  AlertCircle,
  Info,
  Megaphone,
  Calendar,
  Tag
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import ContentCreateModal from '@/components/shared/ContentCreateModal'
import ContentFilters from '@/components/shared/ContentFilters'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const categoryLabels = {
  all: '전체',
  notice: '공지사항',
  event: '이벤트',
  meeting: '모임안내',
  announcement: '발표'
}

const priorityLabels = {
  all: '전체',
  high: '중요',
  medium: '보통',
  low: '일반'
}

const categoryColors = {
  notice: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  event: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  announcement: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
}

const priorityColors = {
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const categoryIcons = {
  notice: AlertCircle,
  event: Bell,
  meeting: Megaphone,
  announcement: Info
}

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'priority', label: '중요도순' },
  { value: 'views', label: '조회순' }
]

// Form fields for create modal
const createFields = [
  {
    name: 'title',
    label: '제목',
    type: 'text' as const,
    placeholder: '공지사항 제목을 입력하세요',
    maxLength: 100,
    validation: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다')
  },
  {
    name: 'category',
    label: '카테고리',
    type: 'select' as const,
    placeholder: '카테고리를 선택해주세요',
    options: Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['notice', 'event', 'meeting', 'announcement'], {
      message: '카테고리를 선택해주세요',
    })
  },
  {
    name: 'priority',
    label: '중요도',
    type: 'select' as const,
    placeholder: '중요도를 선택해주세요',
    options: Object.entries(priorityLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['high', 'medium', 'low'], {
      message: '중요도를 선택해주세요',
    })
  },
  {
    name: 'content',
    label: '내용',
    type: 'textarea' as const,
    placeholder: '공지사항 내용을 입력하세요',
    rows: 10,
    validation: z.string().min(1, '내용을 입력해주세요')
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

export default function AnnouncementsPage() {
  const { user, profile } = useOptimizedAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activePriority, setActivePriority] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  // 상태 관리
  const [announcements, setAnnouncements] = useState<Views<'content_with_author'>[]>([])
  const [loading, setLoading] = useState(true)
  const [operationLoading, setOperationLoading] = useState(false)
  
  // 공지사항 가져오기
  const fetchAnnouncements = async () => {
    setLoading(true)
    const result = await ContentAPI.getList({
      type: 'announcement',
      status: 'published'
    })
    
    if (result.success && result.data) {
      setAnnouncements(result.data)
    } else {
      toast.error('공지사항을 불러오는데 실패했습니다.')
    }
    setLoading(false)
  }
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchAnnouncements()
  }, [])

  // Filter and sort announcements
  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return []
    
    let filtered = [...announcements]

    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(announcement => announcement.category === activeCategory)
    }

    // Priority filter
    if (activePriority !== 'all') {
      const priority = (announcement: Views<'content_with_author'>) => 
        (announcement.metadata as any)?.priority || 'medium'
      filtered = filtered.filter(announcement => priority(announcement) === activePriority)
    }

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(announcement =>
        announcement.title?.toLowerCase().includes(searchLower) ||
        announcement.content?.toLowerCase().includes(searchLower) ||
        announcement.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      )
    }

    // Sorting
    filtered.sort((a, b) => {
      const aIsPinned = (a.metadata as any)?.is_pinned || false
      const bIsPinned = (b.metadata as any)?.is_pinned || false
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1

      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          const aPriority = (a.metadata as any)?.priority || 'medium'
          const bPriority = (b.metadata as any)?.priority || 'medium'
          return priorityOrder[aPriority as keyof typeof priorityOrder] - 
                 priorityOrder[bPriority as keyof typeof priorityOrder]
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      }
    })

    return filtered
  }, [announcements, activeCategory, activePriority, searchTerm, sortBy])

  // Stats
  const stats = {
    total: announcements.length,
    today: announcements.filter(a => {
      const date = new Date(a.created_at || '')
      const today = new Date()
      return date.toDateString() === today.toDateString()
    }).length,
    pinned: announcements.filter(a => (a.metadata as any)?.is_pinned).length,
    high: announcements.filter(a => (a.metadata as any)?.priority === 'high').length
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }
    
    setOperationLoading(true)
    const result = await ContentAPI.delete(id)
    
    if (result.success) {
      toast.success('공지사항이 삭제되었습니다.')
      await fetchAnnouncements()
    } else {
      toast.error(result.error || '공지사항 삭제에 실패했습니다.')
    }
    setOperationLoading(false)
  }

  // Handle create
  const handleCreate = async (values: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    setOperationLoading(true)
    const newAnnouncement: TablesInsert<'content'> = {
      type: 'announcement',
      title: values.title,
      content: values.content,
      category: values.category,
      tags: values.tags || [],
      author_id: user.id,
      status: 'published',
      metadata: {
        priority: values.priority,
        is_pinned: false
      }
    }

    const result = await ContentAPI.create(newAnnouncement)
    
    if (result.success) {
      toast.success('공지사항이 작성되었습니다.')
      setCreateModalOpen(false)
      await fetchAnnouncements()
    } else {
      toast.error(result.error || '공지사항 작성에 실패했습니다.')
    }
    setOperationLoading(false)
  }

  // Handle pin toggle
  const handleTogglePin = async (announcement: Views<'content_with_author'>) => {
    if (!announcement.id) return
    
    setOperationLoading(true)
    const currentPinned = (announcement.metadata as any)?.is_pinned || false
    const result = await ContentAPI.update(announcement.id, {
      metadata: {
        ...(announcement.metadata as any || {}),
        is_pinned: !currentPinned
      }
    })
    
    if (result.success) {
      toast.success(currentPinned ? '고정이 해제되었습니다.' : '공지사항이 고정되었습니다.')
      await fetchAnnouncements()
    } else {
      toast.error('고정 상태 변경에 실패했습니다.')
    }
    setOperationLoading(false)
  }

  // Check permissions
  const canManage = user && profile && ['admin', 'leader', 'vice-leader'].includes(profile.role || '')
  
  const canEdit = (item: Views<'content_with_author'>) => {
    return !!canManage
  }

  const canDelete = (item: Views<'content_with_author'>) => {
    return !!canManage
  }

  // Categories for tabs
  const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="전체 공지"
        value={stats.total}
        icon={Info}
        subtitle={`오늘 +${stats.today}`}
        loading={loading}
      />
      <StatsCard
        title="고정 공지"
        value={stats.pinned}
        icon={Tag}
        subtitle={stats.pinned > 0 ? '현재 고정됨' : undefined}
        loading={loading}
      />
      <StatsCard
        title="중요 공지"
        value={stats.high}
        icon={AlertCircle}
        subtitle={stats.high > 0 ? '주의 필요' : undefined}
        loading={loading}
      />
      <StatsCard
        title="이번 달"
        value={announcements.filter(a => {
          const date = new Date(a.created_at || '')
          const now = new Date()
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        }).length}
        icon={Calendar}
        subtitle="작성된 공지"
        loading={loading}
      />
    </div>
  )

  // Advanced filters
  const advancedFilters = (
    <ContentFilters
      filterGroups={[
        {
          id: 'priority',
          label: '중요도',
          type: 'radio',
          options: Object.entries(priorityLabels).map(([value, label]) => ({
            value,
            label,
            count: value === 'all' 
              ? announcements.length 
              : announcements.filter(a => (a.metadata as any)?.priority === value).length
          })),
          value: activePriority,
          onChange: setActivePriority
        }
      ]}
      onReset={() => setActivePriority('all')}
      activeFiltersCount={activePriority !== 'all' ? 1 : 0}
    />
  )


  return (
    <>
      <ContentListLayout
        title="공지사항"
        description="동아리의 중요한 소식과 일정을 확인하세요"
        searchPlaceholder="제목, 내용, 태그로 검색..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!canManage}
        createButtonText="새 공지 작성"
        onCreateClick={() => setCreateModalOpen(true)}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sortOptions={sortOptions}
        activeSortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showAdvancedFilters={showAdvancedFilters}
        onAdvancedFiltersToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
        advancedFilters={advancedFilters}
        advancedFiltersCount={activePriority !== 'all' ? 1 : 0}
        statsSection={statsSection}
        loading={loading}
        resultCount={filteredAnnouncements.length}
        emptyMessage="공지사항이 없습니다."
        emptyAction={
          !!canManage && (
            <Button 
              className="kepco-gradient" 
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 공지사항을 작성하세요
            </Button>
          )
        }
      >
        <div className={viewMode === 'grid' 
          ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
          : "space-y-4"
        }>
          {filteredAnnouncements.map((announcement, index) => (
            <ContentCard
              key={announcement.id}
              content={announcement}
              viewMode={viewMode}
              categoryLabels={categoryLabels}
              categoryColors={categoryColors}
              categoryIcons={categoryIcons}
              onEdit={() => toast.info('수정 기능은 준비 중입니다.')}
              onDelete={handleDelete}
              canEdit={canEdit(announcement)}
              canDelete={canDelete(announcement)}
              linkPrefix="/announcements"
              index={index}
            />
          ))}
        </div>
      </ContentListLayout>

      {/* Create Modal */}
      <ContentCreateModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        title="새 공지사항 작성"
        description="동아리원들에게 전달할 공지사항을 작성하세요"
        fields={createFields}
        onSubmit={handleCreate}
        loading={operationLoading}
        contentType="announcement"
      />
    </>
  )
}