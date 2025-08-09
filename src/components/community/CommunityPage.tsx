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
  Tag,
  Eye,
  MessageSquare,
  MessageCircle,
  TrendingUp,
  Users
} from 'lucide-react'

// Shared components
import ContentListLayout from '@/components/shared/ContentListLayout'
import ContentCard from '@/components/shared/ContentCard'
import StatsCard from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 카테고리 정보 가져오기
const { categoryLabels, categoryColors, categoryIcons } = getBoardCategoryData('community')

const sortOptions = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'views', label: '조회순' },
  { value: 'comments', label: '댓글순' }
]

export default function CommunityPage() {
  const router = useRouter()
  const { user } = useAuthV2()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  
  // Map sortBy to V2 format
  const getSortByV2 = (sort: string) => {
    switch (sort) {
      case 'latest': return 'created_at'
      case 'popular': return 'like_count'
      case 'views': return 'view_count'
      case 'comments': return 'comment_count'
      default: return 'created_at'
    }
  }
  
  const { data: postsData, isLoading: loading } = contentV2.useInfiniteContents(
    {
      type: 'community',
      categoryId: activeCategory === 'all' ? undefined : activeCategory,
      searchQuery: searchTerm || undefined
    },
    getSortByV2(sortBy),
    'desc',
    100 // Large page size to get all at once for now
  )
  
  const posts = useMemo(() => {
    return postsData?.pages.flatMap(page => page.contents) || []
  }, [postsData])

  // V2 hooks handle filtering and sorting server-side, so we just need final client-side adjustments
  const filteredPosts = useMemo(() => {
    if (!posts) return []
    
    let filtered = [...posts]
    
    // Handle pinned posts priority (V2 schema uses is_pinned field directly)
    filtered.sort((a, b) => {
      const aIsPinned = a.is_pinned || false
      const bIsPinned = b.is_pinned || false
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1
      
      // If both are pinned or both are not pinned, maintain existing order (already sorted by server)
      return 0
    })
    
    return filtered
  }, [posts])

  const stats = {
    totalPosts: posts?.length || 0,
    todayPosts: posts?.filter(p => {
      const postDate = new Date(p.created_at || '')
      const today = new Date()
      return postDate.toDateString() === today.toDateString()
    }).length || 0,
    totalViews: posts?.reduce((sum, p) => sum + (p.interaction_counts?.views || 0), 0) || 0,
    totalComments: posts?.reduce((sum, p) => sum + (p.comment_count || 0), 0) || 0
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }
    
    try {
      await contentV2.deleteContentAsync(id)
      toast.success('게시글이 삭제되었습니다.')
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || '게시글 삭제에 실패했습니다.')
    }
  }

  // Check permissions - V2 uses ContentWithRelations type
  const canEdit = (item: any) => {
    return !!(user && item.author_id === (user as any)?.id)
  }

  const canDelete = (item: any) => {
    return !!(user && (
      (user as any)?.role === 'admin' || 
      (user as any)?.role === 'leader' || 
      (user as any)?.role === 'vice-leader' || 
      item.author_id === (user as any)?.id
    ))
  }

  // Categories for tabs
  const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

  // Stats Section
  const statsSection = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="전체 게시글"
        value={stats.totalPosts}
        icon={MessageSquare}
        subtitle={`오늘 +${stats.todayPosts}`}
        loading={loading}
      />
      <StatsCard
        title="전체 조회수"
        value={stats.totalViews.toLocaleString()}
        icon={Eye}
        loading={loading}
      />
      <StatsCard
        title="전체 댓글"
        value={stats.totalComments}
        icon={MessageCircle}
        loading={loading}
      />
      <StatsCard
        title="고정 게시글"
        value={loading ? 0 : posts?.filter(p => p.is_pinned).length || 0}
        icon={Tag}
        loading={loading}
      />
    </div>
  )

  return (
    <>
      <ContentListLayout
        title={
          <span className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            자유게시판
          </span>
        }
        description={
          <span className="font-semibold">동아리원들과 자유롭게 소통하고 정보를 공유하세요</span>
        }
        searchPlaceholder="제목, 내용, 작성자로 검색"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showCreateButton={!!user}
        createButtonText="새 글 작성"
        onCreateClick={() => router.push('/community/new')}
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
        resultCount={filteredPosts.length}
        emptyMessage="게시글이 없습니다."
        emptyAction={
          user ? (
            <Button 
              className="kepco-gradient" 
              onClick={() => router.push('/community/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              첫 번째 게시글을 작성해보세요!
            </Button>
          ) : null
        }
      >
        {(currentViewMode) => (
          <div className={currentViewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {filteredPosts.map((post, index) => (
              <ContentCard
                key={post.id}
                content={post}
                viewMode={currentViewMode}
              categoryLabels={categoryLabels}
              categoryColors={categoryColors}
              categoryIcons={categoryIcons}
              onEdit={() => router.push(`/community/${post.id}/edit`)}
              onDelete={handleDelete}
              canEdit={canEdit(post)}
              canDelete={canDelete(post)}
              linkPrefix="/community"
              index={index}
            />
          ))}
        </div>
        )}
      </ContentListLayout>
    </>
  )
}