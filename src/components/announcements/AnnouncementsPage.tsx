'use client'

import { useState, useMemo } from 'react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useContentList, useCreateContent, useDeleteContent } from '@/hooks/useSupabase'
import { toast } from 'sonner'
import { Views, TablesInsert, supabase } from '@/lib/supabase/client'
import * as z from 'zod'
import { 
  Plus,
  Megaphone,
  AlertCircle,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import ContentCreateModal from '@/components/shared/ContentCreateModal'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'

const categoryLabels = {
  all: '전체',
  general: '일반',
  important: '중요',
  urgent: '긴급',
  event: '이벤트'
}

const categoryColors = {
  general: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  important: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  event: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
}

const categoryIcons = {
  general: Info,
  important: AlertCircle,
  urgent: Megaphone,
  event: CheckCircle
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
    name: 'category',
    label: '카테고리',
    type: 'select' as const,
    placeholder: '카테고리를 선택해주세요',
    options: Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => ({ value, label })),
    validation: z.enum(['general', 'important', 'urgent', 'event'], {
      message: '카테고리를 선택해주세요',
    })
  },
  {
    name: 'title',
    label: '제목',
    type: 'text' as const,
    placeholder: '제목을 입력하세요',
    maxLength: 100,
    validation: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다')
  },
  {
    name: 'content',
    label: '내용',
    type: 'textarea' as const,
    placeholder: '내용을 입력하세요',
    rows: 10,
    maxLength: 5000,
    validation: z.string().min(1, '내용을 입력해주세요').max(5000, '내용은 5000자 이하여야 합니다')
  }
]

export default function AnnouncementsPage() {
  const { user, profile } = useOptimizedAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  // viewMode is now handled by ContentListLayout's autoResponsiveViewMode
  const [createModalOpen, setCreateModalOpen] = useState(false)
  
  // Use Supabase hooks
  const { data: announcements, loading, refetch } = useContentList({
    type: 'announcement',
    status: 'published'
  })
  const { createContent, loading: createLoading } = useCreateContent()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()

  // Filter and sort announcements
  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return []
    
    let filtered = [...announcements]
    
    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(announcement => announcement.category === activeCategory)
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(announcement => 
        announcement.title?.toLowerCase().includes(searchLower) ||
        announcement.content?.toLowerCase().includes(searchLower) ||
        announcement.author_name?.toLowerCase().includes(searchLower)
      )
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const aIsPinned = (a.metadata as any)?.is_pinned || false
      const bIsPinned = (b.metadata as any)?.is_pinned || false
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1
      
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
  }, [announcements, activeCategory, searchTerm, sortBy])

  const stats = {
    totalAnnouncements: announcements?.length || 0,
    todayAnnouncements: announcements?.filter(a => {
      const announcementDate = new Date(a.created_at || '')
      const today = new Date()
      return announcementDate.toDateString() === today.toDateString()
    }).length || 0,
    totalViews: announcements?.reduce((sum, a) => sum + (a.view_count || 0), 0) || 0,
    totalComments: announcements?.reduce((sum, a) => sum + (a.comment_count || 0), 0) || 0
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }
    
    try {
      const result = await deleteContent(id)
      if (result.error) {
        throw result.error
      }
      toast.success('공지사항이 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
    }
  }

  // Handle create
  const handleCreate = async (values: any) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const newAnnouncement: TablesInsert<'content'> = {
        type: 'announcement',
        title: values.title.trim(),
        content: values.content.trim(),
        category: values.category,
        author_id: user.id,
        status: 'published',
        metadata: {}
      }

      const result = await createContent(newAnnouncement)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success('공지사항이 작성되었습니다.')
      setCreateModalOpen(false)
      refetch()
    } catch (error: any) {
      console.error('Error creating announcement:', error)
      toast.error(error.message || '공지사항 작성에 실패했습니다.')
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

  const canPin = (item: Views<'content_with_author'>) => {
    return !!(user && profile && (
      profile.role === 'admin' || 
      profile.role === 'leader' || 
      profile.role === 'vice-leader'
    ))
  }

  // Handle pin/unpin
  const handlePin = async (id: string, pinned: boolean) => {
    if (!user || !profile) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('content')
        .update({
          metadata: { is_pinned: pinned }
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      toast.success(pinned ? '공지사항이 고정되었습니다.' : '공지사항 고정이 해제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error updating pin status:', error)
      toast.error(error.message || '고정 상태 변경에 실패했습니다.')
    }
  }

  // Categories for tabs
  const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="전체 공지사항"
        value={stats.totalAnnouncements}
        icon={Megaphone}
        subtitle={`오늘 +${stats.todayAnnouncements}`}
        loading={loading}
      />
      <StatsCard
        title="전체 조회수"
        value={stats.totalViews.toLocaleString()}
        icon={Clock}
        loading={loading}
      />
      <StatsCard
        title="전체 댓글"
        value={stats.totalComments}
        icon={CheckCircle}
        loading={loading}
      />
      <StatsCard
        title="중요 공지"
        value={loading ? 0 : announcements?.filter(a => a.category === 'important' || a.category === 'urgent').length || 0}
        icon={AlertCircle}
        loading={loading}
      />
    </div>
  )

  return (
    <>
      <ContentListLayout
        title="공지사항"
        description="동아리 운영진의 중요한 소식을 확인하세요"
        searchPlaceholder="제목, 내용, 작성자로 검색"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!(user && profile && ['admin', 'leader', 'vice-leader'].includes(profile.role))}
        createButtonText="새 공지 작성"
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
        resultCount={filteredAnnouncements.length}
        emptyMessage="공지사항이 없습니다."
        emptyAction={
          user && profile && ['admin', 'leader', 'vice-leader'].includes(profile.role) && (
            <Button 
              className="kepco-gradient" 
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 공지사항을 작성해보세요!
            </Button>
          )
        }
      >
        {(currentViewMode) => (
          <div className={currentViewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {filteredAnnouncements.map((announcement, index) => (
              <ContentCard
                key={announcement.id}
                content={announcement}
                viewMode={currentViewMode}
                categoryLabels={categoryLabels}
                categoryColors={categoryColors}
                categoryIcons={categoryIcons}
                onEdit={() => toast.info('수정 기능은 준비 중입니다.')}
                onDelete={handleDelete}
                onPin={handlePin}
                canEdit={canEdit(announcement)}
                canDelete={canDelete(announcement)}
                canPin={canPin(announcement)}
                linkPrefix="/announcements"
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
        title="새 공지사항 작성"
        description="동아리원들에게 전달할 중요한 소식을 작성해주세요"
        fields={createFields}
        onSubmit={handleCreate}
        loading={createLoading}
        contentType="announcement"
      />
    </>
  )
}