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
import { 
  useContent,
  useIsLiked,
  useToggleLike,
  useDeleteContent
} from '@/hooks/useSupabase'
import { Views, supabase } from '@/lib/supabase/client'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { toast } from 'sonner'
import { ContentAPI } from '@/lib/api/content'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'
import DetailLayout from '@/components/shared/DetailLayout'

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
  const { user, profile, isMember } = useOptimizedAuth()
  const router = useRouter()
  
  // Use Supabase hooks
  const { data: postData, loading, error } = useContent(postId)
  const isLikedFromHook = useIsLiked(user?.id, postId)
  const { toggleLike, loading: likeLoading } = useToggleLike()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment', id: string } | null>(null)



  // Increment view count when post is loaded
  useEffect(() => {
    if (postData?.id) {
      ContentAPI.incrementViewCount(postData.id)
    }
  }, [postData?.id])

  // Update like count and like state when data changes
  useEffect(() => {
    if (postData?.like_count !== undefined) {
      setLikeCount(postData.like_count || 0)
    }
  }, [postData])
  
  // Update like state from hook
  useEffect(() => {
    setIsLiked(isLikedFromHook)
  }, [isLikedFromHook])

  // Listen for report dialog events
  const [parentContentId, setParentContentId] = useState<string | undefined>()
  
  useEffect(() => {
    const handleOpenReportDialog = (event: CustomEvent) => {
      const { targetType, targetId, parentContentId } = event.detail
      if (targetType && targetId) {
        setReportTarget({ type: targetType, id: targetId })
        setParentContentId(parentContentId)
        setReportDialogOpen(true)
      }
    }

    window.addEventListener('openReportDialog', handleOpenReportDialog as any)
    return () => {
      window.removeEventListener('openReportDialog', handleOpenReportDialog as any)
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
      const result = await toggleLike(user.id, postId)
      
      if (result.error) {
        throw result.error
      }
      
      // Get the updated state by checking the current like status
      const { data: currentLike } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', postId)
        .eq('type', 'like')
        .single()
      
      const isNowLiked = !!currentLike
      setIsLiked(isNowLiked)
      
      // Get updated like count from content
      const { data: updatedContent } = await supabase
        .from('content_with_author')
        .select('like_count')
        .eq('id', postId)
        .single()
      
      if (updatedContent) {
        setLikeCount(updatedContent.like_count || 0)
      }
      
      toast.success(isNowLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.')
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
    
    setIsBookmarked(!isBookmarked)
    toast.success(isBookmarked ? '북마크를 취소했습니다.' : '북마크에 추가했습니다.')
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('링크가 클립보드에 복사되었습니다.')
  }

  const handleEdit = () => {
    // 수정 페이지로 이동 (아직 구현되지 않음)
    toast.info('수정 기능은 준비 중입니다.')
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      return
    }

    try {
      const result = await deleteContent(postId)
      
      if (result.error) {
        throw result.error
      }

      toast.success('게시글이 삭제되었습니다.')
      router.push('/community')
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || '게시글 삭제에 실패했습니다.')
    }
  }

  const formatContent = (content: string) => {
    return content.replace(/\n/g, '<br/>')
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

  const CategoryIcon = categoryIcons[postData.category as keyof typeof categoryIcons] || MessageCircle

  return (
    <>
      <DetailLayout
        title={postData.title || ''}
        content={formatContent(postData.content || '')}
        author={{
          id: postData.author_id || '',
          name: postData.author_name || '익명',
          avatar: postData.author_avatar_url || undefined,
          department: postData.author_department || undefined
        }}
        createdAt={postData.created_at || new Date().toISOString()}
        viewCount={postData.view_count || 0}
        category={{
          label: categoryLabels[postData.category as keyof typeof categoryLabels] || '토론',
          value: postData.category || 'discussion',
          color: categoryColors[postData.category as keyof typeof categoryColors],
          icon: CategoryIcon
        }}
        tags={postData.tags || []}
        likeCount={likeCount}
        commentCount={postData.comment_count || 0}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        canEdit={!!(user && user.id === postData.author_id)}
        canDelete={!!(user && (user.id === postData.author_id || ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')))}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onEdit={handleEdit}
        onDelete={handleDelete}
        actionButtons={
          <Button variant="outline" size="sm" onClick={() => {
            setReportTarget({ type: 'content', id: postId })
            setReportDialogOpen(true)
          }}>
            <Flag className="mr-2 h-4 w-4" />
            신고
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
        targetType={reportTarget?.type}
        targetId={reportTarget?.id}
        parentContentId={parentContentId}
        postType={reportTarget?.type === 'comment' ? 'comment' : 'community'}
      />
    </>
  )
}