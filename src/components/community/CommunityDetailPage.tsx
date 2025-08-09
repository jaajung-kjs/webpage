'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  MessageCircle,
  Coffee,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Flag
} from 'lucide-react'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { useInteractionsV2 } from '@/hooks/features/useInteractionsV2'

import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'
import DetailLayout from '@/components/shared/DetailLayout'
import type { ReportDialogEvent } from '@/lib/types'

interface CommunityDetailPageProps {
  postId: string
}

const categoryLabels = {
  tips: '꿀팁공유',
  review: '후기',
  help: '도움요청',
  discussion: '토론',
  question: '질문',
  chat: '잡담'
}

const categoryColors = {
  tips: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  review: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  help: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  discussion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  question: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  chat: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const categoryIcons = {
  tips: Lightbulb,
  review: BookOpen,
  help: HelpCircle,
  discussion: MessageCircle,
  question: HelpCircle,
  chat: Coffee
}

export default function CommunityDetailPage({ postId }: CommunityDetailPageProps) {
  const { user, profile, isMember } = useAuth()
  const router = useRouter()
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  const interactionsV2 = useInteractionsV2()
  
  const { data: postData, isPending: loading } = contentV2.useContent(postId)
  const { data: interactionStats } = interactionsV2.useInteractionStats(postId, 'content')
  const { data: userInteractions } = interactionsV2.useUserInteractions(postId, 'content')
  
  // Derive interaction states
  const isLiked = Array.isArray(userInteractions) ? userInteractions.some((interaction: any) => interaction.interaction_type === 'like') : false
  const likeCount = (interactionStats as any)?.likes || 0
  const bookmarkCount = (interactionStats as any)?.bookmarks || 0
  const userBookmarked = Array.isArray(userInteractions) ? userInteractions.some((interaction: any) => interaction.interaction_type === 'bookmark') : false
  
  // UI state
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment' | 'post' | 'announcement' | 'resource' | 'case' | 'user', id: string } | null>(null)
  
  // Use mutation loading states from V2 hooks
  const likeLoading = interactionsV2.isToggling
  const bookmarkLoading = interactionsV2.isToggling  
  const deleteLoading = contentV2.isDeleting



  // Increment view count when post is loaded
  useEffect(() => {
    if (postData?.id) {
      contentV2.toggleInteraction({ targetId: postData.id, targetType: 'content', interactionType: 'view' })
    }
  }, [postData?.id, contentV2.toggleInteraction])



  // Listen for report dialog events
  const [parentContentId, setParentContentId] = useState<string | undefined>()
  
  useEffect(() => {
    const handleOpenReportDialog = (event: Event) => {
      // Type guard to check if it's a ReportDialogEvent
      if (event.type === 'openReportDialog' && 'detail' in event) {
        const customEvent = event as ReportDialogEvent
        const { contentType, contentId } = customEvent.detail
        if (contentType && contentId) {
          setReportTarget({ type: contentType, id: contentId })
          setParentContentId(contentId)
          setReportDialogOpen(true)
        }
      }
    }

    window.addEventListener('openReportDialog', handleOpenReportDialog)
    return () => {
      window.removeEventListener('openReportDialog', handleOpenReportDialog)
    }
  }, [])

  const handleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    if (!isMember) {
      toast.error('동아리 회원만 좋아요를 누를 수 있습니다.')
      return
    }

    // Prevent multiple clicks
    if (likeLoading) return

    try {
      await interactionsV2.toggleInteractionAsync({
        targetId: postId,
        targetType: 'content',
        interactionType: 'like'
      })
      // The mutation will automatically update the cache and trigger a re-render
      toast.success(isLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error(error.message || '좋아요 처리에 실패했습니다.')
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    if (!isMember) {
      toast.error('동아리 회원만 북마크를 사용할 수 있습니다.')
      return
    }

    // Prevent multiple clicks
    if (bookmarkLoading) return

    try {
      await interactionsV2.toggleInteractionAsync({
        targetId: postId,
        targetType: 'content',
        interactionType: 'bookmark'
      })
      toast.success(userBookmarked ? '북마크를 취소했습니다.' : '북마크에 추가했습니다.')
    } catch (error: any) {
      console.error('Error toggling bookmark:', error)
      toast.error(error.message || '북마크 처리에 실패했습니다.')
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('링크가 클립보드에 복사되었습니다.')
  }

  const handleEdit = () => {
    router.push(`/community/${postId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      await contentV2.deleteContentAsync(postId)
      
      toast.success('게시글이 삭제되었습니다.')
      router.push('/community')
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || '게시글 삭제에 실패했습니다.')
    }
  }


  if (loading || !postData) {
    return (
      <DetailLayout
        title={loading ? "로딩 중..." : "게시글을 찾을 수 없습니다."}
        content=""
        author={{ id: "", name: "", avatar: "" }}
        createdAt={new Date().toISOString()}
        viewCount={0}
        likeCount={0}
        commentCount={0}
        isLiked={false}
        isBookmarked={false}
        canEdit={false}
        canDelete={false}
        onLike={() => {}}
        onBookmark={() => {}}
        onShare={() => {}}
        backLink="/community"
        loading={loading}
      />
    )
  }

  const CategoryIcon = categoryIcons[postData.categories?.[0]?.slug as keyof typeof categoryIcons] || MessageCircle

  return (
    <>
      <DetailLayout
        title={postData.title || ''}
        content={postData.content || ''}
        author={{
          id: postData.author_id || '',
          name: postData.author?.name || '익명',
          avatar: postData.author?.avatar_url || undefined,
          department: postData.author?.department || undefined
        }}
        createdAt={postData.created_at || new Date().toISOString()}
        viewCount={postData.interaction_counts?.views || 0}
        category={{
          label: categoryLabels[postData.categories?.[0]?.slug as keyof typeof categoryLabels] || '토론',
          value: postData.categories?.[0]?.slug || 'discussion',
          color: categoryColors[postData.categories?.[0]?.slug as keyof typeof categoryColors],
          icon: CategoryIcon
        }}
        tags={postData.tags?.map(tag => tag.name) || []}
        likeCount={likeCount}
        commentCount={postData.comment_count || 0}
        isLiked={isLiked}
        isBookmarked={userBookmarked}
        canEdit={!!(user && user.id === postData.author_id)}
        canDelete={!!(user && (user.id === postData.author_id || ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')))}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actionButtons={
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 flex-shrink-0"
            onClick={() => {
              setReportTarget({ type: 'content', id: postId })
              setReportDialogOpen(true)
            }}
          >
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">신고</span>
          </Button>
        }
        backLink="/community"
        backLinkText="자유게시판 목록"
        loading={loading}
        likeLoading={likeLoading}
        deleteLoading={deleteLoading}
      >
        <CommentSection contentId={postId} />
      </DetailLayout>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open)
          if (!open) {
            setReportTarget(null)
            setParentContentId(undefined)
          }
        }}
        postId={reportTarget?.type === 'content' ? reportTarget.id : undefined}
        commentId={reportTarget?.type === 'comment' ? reportTarget.id : undefined}
        targetType={reportTarget?.type === 'comment' ? 'comment' : 'content'}
        targetId={reportTarget?.id}
        parentContentId={parentContentId}
        postType={reportTarget?.type === 'comment' ? 'comment' : 'community'}
      />
    </>
  )
}