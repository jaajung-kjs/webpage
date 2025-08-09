'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { useInteractionsV2 } from '@/hooks/features/useInteractionsV2'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import PermissionGate from '@/components/shared/PermissionGate'
import DetailLayout from '@/components/shared/DetailLayout'
import CommentSection from '@/components/shared/CommentSection'
import type { ReportDialogEvent } from '@/lib/types'

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
  const { user, profile, isMember } = useAuth()
  const router = useRouter()
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  const interactionsV2 = useInteractionsV2()
  
  const { data: announcementData, isPending: loading } = contentV2.useContent(announcementId)
  const { data: interactionStats } = interactionsV2.useInteractionStats(announcementId, 'content')
  const { data: userInteractions } = interactionsV2.useUserInteractions(announcementId, 'content')
  
  // Derive interaction states
  const isLiked = Array.isArray(userInteractions) ? userInteractions.some((interaction: any) => interaction.interaction_type === 'like') : false
  const likeCount = (interactionStats as any)?.likes || 0
  const isBookmarked = Array.isArray(userInteractions) ? userInteractions.some((interaction: any) => interaction.interaction_type === 'bookmark') : false
  
  // UI state
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment' | 'post' | 'announcement' | 'resource' | 'case' | 'user', id: string } | null>(null)
  const [parentContentId, setParentContentId] = useState<string | undefined>()
  
  // Use mutation loading states
  const likeLoading = interactionsV2.isToggling
  const bookmarkLoading = interactionsV2.isToggling
  const deleteLoading = contentV2.isDeleting

  // Increment view count when announcement is loaded
  useEffect(() => {
    if (announcementData?.id) {
      contentV2.toggleInteraction({ targetId: announcementData.id, targetType: 'content', interactionType: 'view' })
    }
  }, [announcementData?.id, contentV2.toggleInteraction])



  // Listen for report dialog events
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

  // Bookmark state is now managed by V2 interactions hook

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
        targetId: announcementId,
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

    if (bookmarkLoading) return
    
    try {
      await interactionsV2.toggleInteractionAsync({
        targetId: announcementId,
        targetType: 'content',
        interactionType: 'bookmark'
      })
      toast.success(isBookmarked ? '북마크를 취소했습니다.' : '북마크에 추가했습니다.')
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
    router.push(`/announcements/${announcementId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 공지사항을 삭제하시겠습니까?')) {
      return
    }

    try {
      await contentV2.deleteContentAsync(announcementId)
      
      toast.success('공지사항이 삭제되었습니다.')
      router.push('/announcements')
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
    }
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

  const primaryCategoryObj = announcementData.categories?.[0]
  const primaryCategory = primaryCategoryObj?.slug || primaryCategoryObj?.name || 'notice'
  const CategoryIcon = categoryIcons[primaryCategory as keyof typeof categoryIcons] || categoryIcons.notice
  const metadata = (announcementData as any)?.metadata || {}

  return (
    <PermissionGate requireMember={true}>
      <DetailLayout
        title={announcementData.title || ''}
        content={announcementData.content || ''}
        author={{
          id: announcementData.author_id || '',
          name: announcementData.author?.name || '익명',
          avatar: announcementData.author?.avatar_url || undefined,
          department: announcementData.author?.department || undefined
        }}
        createdAt={announcementData.created_at || new Date().toISOString()}
        viewCount={announcementData.interaction_counts?.views || 0}
        category={{
          label: categoryLabels[primaryCategory as keyof typeof categoryLabels] || '공지사항',
          value: primaryCategory,
          color: categoryColors[primaryCategory as keyof typeof categoryColors],
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
        targetType={reportTarget?.type === 'comment' ? 'comment' : 'content'}
        targetId={reportTarget?.id}
        parentContentId={parentContentId}
        postType={reportTarget?.type === 'comment' ? 'comment' : 'announcement'}
      />
    </PermissionGate>
  )
}