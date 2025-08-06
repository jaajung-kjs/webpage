'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Lightbulb,
  Flag
} from 'lucide-react'
import { useContent, useToggleLike, useDeleteContent, useIsLiked, useIncrementView } from '@/hooks/features/useContent'

import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'
import DetailLayout from '@/components/shared/DetailLayout'



interface CaseDetailPageProps {
  caseId: string
}

const categoryLabels = {
  productivity: '생산성 향상',
  creativity: '창의적 활용',
  development: '개발',
  analysis: '분석',
  other: '기타'
}

const categoryColors = {
  productivity: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  creativity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  development: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

const categoryIcons = {
  productivity: Lightbulb,
  creativity: Lightbulb,
  development: Lightbulb,
  analysis: Lightbulb,
  other: Lightbulb
}

export default function CaseDetailPage({ caseId }: CaseDetailPageProps) {
  const { user, profile, isMember } = useAuth()
  const router = useRouter()
  
  // Use hooks
  const { data: caseData, isLoading: loading } = useContent(caseId)
  const { data: isLikedFromHook } = useIsLiked(caseId)
  const toggleLikeMutation = useToggleLike()
  const deleteContentMutation = useDeleteContent()
  const incrementViewMutation = useIncrementView()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment', id: string } | null>(null)
  const [parentContentId, setParentContentId] = useState<string | undefined>()
  const [likeLoading, setLikeLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Increment view count when case is loaded
  useEffect(() => {
    if (caseData?.id) {
      incrementViewMutation.mutate(caseData.id)
    }
  }, [caseData?.id])


  // Update like count and like state when data changes
  useEffect(() => {
    if (caseData?.like_count !== undefined) {
      setLikeCount(caseData.like_count || 0)
    }
  }, [caseData])
  
  // Update like state from hook
  useEffect(() => {
    setIsLiked(isLikedFromHook || false)
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

    setLikeLoading(true)
    try {
      const isNowLiked = await toggleLikeMutation.mutateAsync(caseId)
      
      setIsLiked(isNowLiked)
      setLikeCount(prev => isNowLiked ? prev + 1 : prev - 1)
      
      toast.success(isNowLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.')
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error(error.message || '좋아요 처리에 실패했습니다.')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('링크가 클립보드에 복사되었습니다.')
  }

  const handleBookmark = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    setIsBookmarked(!isBookmarked)
    toast.success(isBookmarked ? '북마크를 취소했습니다.' : '북마크에 추가했습니다.')
  }

  const handleEdit = () => {
    router.push(`/cases/${caseId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 활용사례를 삭제하시겠습니까?')) {
      return
    }

    setDeleteLoading(true)
    try {
      await deleteContentMutation.mutateAsync({ id: caseId, contentType: 'case' })
      
      toast.success('활용사례가 삭제되었습니다.')
      router.push('/cases')
    } catch (error: any) {
      console.error('Error deleting case:', error)
      toast.error(error.message || '활용사례 삭제에 실패했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }


  if (loading || !caseData) {
    return (
      <DetailLayout
        title={loading ? "로딩 중..." : "케이스를 찾을 수 없습니다."}
        content={""}
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
        backLink="/cases"
        loading={loading}
      />
    )
  }

  return (
    <>
      <DetailLayout
        title={caseData.title || ''}
        content={caseData.content || ''}
        author={{
          id: caseData.author_id || '',
          name: caseData.author_name || '익명',
          avatar: caseData.author_avatar_url || undefined,
          department: caseData.author_department || undefined
        }}
        createdAt={caseData.created_at || new Date().toISOString()}
        viewCount={caseData.view_count || 0}
        category={{
          label: categoryLabels[caseData.category as keyof typeof categoryLabels] || '기타',
          value: caseData.category || 'other',
          color: categoryColors[caseData.category as keyof typeof categoryColors],
          icon: categoryIcons[caseData.category as keyof typeof categoryIcons] || Lightbulb
        }}
        tags={caseData.tags || []}
        likeCount={likeCount}
        commentCount={caseData.comment_count || 0}
        isLiked={isLiked}
        isBookmarked={isBookmarked}
        canEdit={!!(user && user.id === caseData.author_id)}
        canDelete={!!(user && (user.id === caseData.author_id || ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')))}
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
              setReportTarget({ type: 'content', id: caseId })
              setReportDialogOpen(true)
            }}
          >
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">신고</span>
          </Button>
        }
        backLink="/cases"
        backLinkText="활용사례 목록"
        loading={loading}
        likeLoading={likeLoading}
        deleteLoading={deleteLoading}
      >
        <CommentSection contentId={caseId} />
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
        postType={reportTarget?.type === 'comment' ? 'comment' : 'case'}
      />
    </>
  )
}
