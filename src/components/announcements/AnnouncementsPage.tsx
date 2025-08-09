'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { supabaseClient } from '@/lib/core/connection-core'
import { toast } from 'sonner'
import { Tables } from '@/lib/database.types'
import { getBoardCategoryData } from '@/lib/categories'
import { 
  Plus,
  Clock,
  Megaphone,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import StatsCard from '@/components/shared/StatsCard'
import { Button } from '@/components/ui/button'

// 카테고리 정보 가져오기
const { categoryLabels, categoryColors, categoryIcons } = getBoardCategoryData('announcements')

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'comments', label: '댓글순' }
]

export default function AnnouncementsPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  
  const { 
    data: announcementsData, 
    isPending: loading,
    refetch
  } = contentV2.useInfiniteContents({
    type: 'announcement'
  }, sortBy as any)
  
  const announcements = announcementsData?.pages.flatMap(page => page.contents) || []

  // Filter and sort announcements
  const filteredAnnouncements = useMemo(() => {
    if (!announcements) return []
    
    let filtered = [...announcements]
    
    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(announcement => 
        announcement.categories?.some(cat => cat.slug === activeCategory)
      )
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(announcement => 
        announcement.title?.toLowerCase().includes(searchLower) ||
        announcement.content?.toLowerCase().includes(searchLower) ||
        announcement.author?.name?.toLowerCase().includes(searchLower)
      )
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const aIsPinned = a.is_pinned || false
      const bIsPinned = b.is_pinned || false
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1
      
      switch (sortBy) {
        case 'popular':
          return (b.interaction_counts?.likes || 0) - (a.interaction_counts?.likes || 0)
        case 'views':
          return (b.interaction_counts?.views || 0) - (a.interaction_counts?.views || 0)
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
    totalViews: announcements?.reduce((sum, a) => sum + (a.interaction_counts?.views || 0), 0) || 0,
    totalComments: announcements?.reduce((sum, a) => sum + (a.comment_count || 0), 0) || 0
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }
    
    try {
      await contentV2.deleteContentAsync(id)
      toast.success('공지사항이 삭제되었습니다.')
      refetch()
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
    }
  }

  // Check permissions
  const canEdit = (item: any) => {
    return !!(user && profile && item.author_id === user.id)
  }

  const canDelete = (item: any) => {
    return !!(user && profile && (
      profile.role === 'admin' || 
      profile.role === 'leader' || 
      profile.role === 'vice-leader' || 
      item.author_id === user.id
    ))
  }

  const canPin = (item: any) => {
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
      await contentV2.updateContentAsync({
        id,
        updates: {
          is_pinned: pinned
        }
      })

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
        value={loading ? 0 : announcements?.filter(a => 
          a.categories?.some(cat => cat.slug === 'important' || cat.slug === 'urgent')
        ).length || 0}
        icon={AlertCircle}
        loading={loading}
      />
    </div>
  )

  return (
    <>
      <ContentListLayout
        title={
          <span className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            공지사항
          </span>
        }
        description={
          <span className="font-semibold">동아리 운영진의 중요한 소식을 확인하세요</span>
        }
        searchPlaceholder="제목, 내용, 작성자로 검색"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!(user && profile && ['admin', 'leader', 'vice-leader'].includes(profile.role))}
        createButtonText="새 공지 작성"
        onCreateClick={() => router.push('/announcements/new')}
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
              onClick={() => router.push('/announcements/new')}
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
                onEdit={() => router.push(`/announcements/${announcement.id}/edit`)}
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
    </>
  )
}