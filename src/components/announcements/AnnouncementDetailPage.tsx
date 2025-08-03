'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell,
  AlertCircle,
  Info,
  Megaphone,
  Pin,
  Flag
} from 'lucide-react'
import { supabase, Views, Tables } from '@/lib/supabase/client'
import { 
  useContent,
  useIsLiked,
  useToggleLike,
  useDeleteContent
} from '@/hooks/useSupabase'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { toast } from 'sonner'
import { ContentAPI } from '@/lib/api/content'
import { ReportDialog } from '@/components/ui/report-dialog'
import PermissionGate from '@/components/shared/PermissionGate'
import DetailLayout from '@/components/shared/DetailLayout'
import CommentSection from '@/components/shared/CommentSection'
import AttachmentsList from '@/components/shared/AttachmentsList'

interface AnnouncementDetailPageProps {
  announcementId: string
}

const categoryLabels = {
  notice: '공지사항',
  event: '이벤트',
  meeting: '모임안내',
  announcement: '발표'
}

const priorityLabels = {
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

export default function AnnouncementDetailPage({ announcementId }: AnnouncementDetailPageProps) {
  const { user, profile, isMember } = useOptimizedAuth()
  const router = useRouter()
  
  // Use Supabase hooks
  const { data: announcementData, loading } = useContent(announcementId)
  const isLikedFromHook = useIsLiked(user?.id, announcementId)
  const { toggleLike, loading: likeLoading } = useToggleLike()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment', id: string } | null>(null)
  const [parentContentId, setParentContentId] = useState<string | undefined>()
  const [attachments, setAttachments] = useState<Tables<'content_attachments'>[]>([])

  // Increment view count when announcement is loaded
  useEffect(() => {
    if (announcementData?.id) {
      ContentAPI.incrementViewCount(announcementData.id)
    }
  }, [announcementData?.id])

  // Fetch attachments when announcement is loaded
  useEffect(() => {
    if (announcementData?.id) {
      fetchAttachments(announcementData.id)
    }
  }, [announcementData?.id])

  const fetchAttachments = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('content_attachments')
        .select('*')
        .eq('content_id', contentId)
        .order('display_order', { ascending: true })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
    }
  }

  // Update like count when data changes
  useEffect(() => {
    if (announcementData?.like_count !== undefined) {
      setLikeCount(announcementData.like_count || 0)
    }
  }, [announcementData])
  
  // Update like state from hook
  useEffect(() => {
    setIsLiked(isLikedFromHook)
  }, [isLikedFromHook])

  // Listen for report dialog events
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

  // Check if user has bookmarked this announcement
  useEffect(() => {
    const checkBookmark = async () => {
      if (!user || !announcementData) return
      
      try {
        const { data } = await supabase
          .from('interactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', announcementId)
          .eq('type', 'bookmark')
          .single()
          
        setIsBookmarked(!!data)
      } catch (error) {
        console.error('Error checking bookmark:', error)
        setIsBookmarked(false)
      }
    }
    
    checkBookmark()
  }, [user, announcementId, announcementData])

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
      const result = await toggleLike(user.id, announcementId)
      
      if (result.error) {
        throw result.error
      }
      
      // Get the updated state by checking the current like status
      const { data: currentLike } = await supabase
        .from('interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_id', announcementId)
        .eq('type', 'like')
        .single()
      
      const isNowLiked = !!currentLike
      setIsLiked(isNowLiked)
      
      // Get updated like count from content
      const { data: updatedContent } = await supabase
        .from('content_with_author')
        .select('like_count')
        .eq('id', announcementId)
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

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('interactions')
          .delete()
          .eq('user_id', user.id)
          .eq('content_id', announcementId)
          .eq('type', 'bookmark')
          
        if (error) throw error
        setIsBookmarked(false)
        toast.success('북마크에서 제거되었습니다.')
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('interactions')
          .insert({
            user_id: user.id,
            content_id: announcementId,
            type: 'bookmark'
          })
          
        if (error) throw error
        setIsBookmarked(true)
        toast.success('북마크에 추가되었습니다.')
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast.error('북마크 처리에 실패했습니다.')
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('링크가 클립보드에 복사되었습니다.')
  }

  const handleEdit = () => {
    toast.info('수정 기능은 준비 중입니다.')
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }

    try {
      const result = await deleteContent(announcementId)
      
      if (result.error) {
        throw result.error
      }

      toast.success('공지사항이 삭제되었습니다.')
      router.push('/announcements')
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
    }
  }

  const formatContent = (content: string) => {
    return content.replace(/\n/g, '<br/>')
  }

  if (loading || !announcementData) {
    return (
      <PermissionGate requireMember={true}>
        <DetailLayout
          title={loading ? "로딩 중..." : "공지사항을 찾을 수 없습니다."}
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
          backLink="/announcements"
          loading={loading}
        />
      </PermissionGate>
    )
  }

  const CategoryIcon = categoryIcons[announcementData.category as keyof typeof categoryIcons] || categoryIcons.notice
  const metadata = announcementData.metadata as any || {}

  return (
    <PermissionGate requireMember={true}>
      <DetailLayout
        title={announcementData.title || ''}
        content={formatContent(announcementData.content || '')}
        author={{
          id: announcementData.author_id || '',
          name: announcementData.author_name || '익명',
          avatar: announcementData.author_avatar_url || undefined,
          department: announcementData.author_department || undefined
        }}
        createdAt={announcementData.created_at || new Date().toISOString()}
        viewCount={announcementData.view_count || 0}
        category={{
          label: categoryLabels[announcementData.category as keyof typeof categoryLabels] || '공지사항',
          value: announcementData.category || 'notice',
          color: categoryColors[announcementData.category as keyof typeof categoryColors],
          icon: CategoryIcon
        }}
        tags={announcementData.tags || []}
        likeCount={likeCount}
        commentCount={announcementData.comment_count || 0}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        canEdit={!!(user && user.id === announcementData.author_id)}
        canDelete={!!(user && (user.id === announcementData.author_id || ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')))}
        onLike={handleLike}
        onBookmark={handleBookmark}
        onShare={handleShare}
        onEdit={handleEdit}
        onDelete={handleDelete}
        additionalInfo={
          <>
            {/* Priority badge */}
            {metadata.priority && (
              <div className="mb-4 flex items-center gap-2">
                {metadata.is_pinned && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                    <Pin className="mr-1 h-3 w-3" />
                    고정
                  </Badge>
                )}
                <Badge 
                  variant="outline"
                  className={priorityColors[metadata.priority as keyof typeof priorityColors] || ''}
                >
                  {priorityLabels[metadata.priority as keyof typeof priorityLabels] || '일반'}
                </Badge>
              </div>
            )}

            {/* Priority Notice */}
            {metadata.priority === 'high' && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">중요 공지사항</span>
                </div>
                <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                  이 공지사항은 중요도가 높은 내용입니다. 반드시 확인해주세요.
                </p>
              </div>
            )}
          </>
        }
        actionButtons={
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 flex-shrink-0"
            onClick={() => {
              setReportTarget({ type: 'content', id: announcementId })
              setReportDialogOpen(true)
            }}
          >
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">신고</span>
          </Button>
        }
        backLink="/announcements"
        backLinkText="공지사항 목록"
        loading={loading}
        likeLoading={likeLoading}
        deleteLoading={deleteLoading}
      >
        <AttachmentsList attachments={attachments} className="mb-8" />
        <CommentSection contentId={announcementId} />
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
        postType={reportTarget?.type === 'comment' ? 'comment' : 'announcement'}
      />
    </PermissionGate>
  )
}