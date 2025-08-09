'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download,
  BookOpen,
  FileText,
  Video,
  Presentation,
  File,
  ExternalLink,
  Tag
} from 'lucide-react'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { useInteractionsV2 } from '@/hooks/features/useInteractionsV2'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useAuthV2 } from '@/hooks/features/useAuthV2'
import { toast } from 'sonner'
import DetailLayout from '@/components/shared/DetailLayout'
import CommentSection from '@/components/shared/CommentSection'

interface ResourceDetailPageProps {
  resourceId: string
}

const categoryLabels = {
  tutorial: '튜토리얼',
  workshop: '워크샵',
  template: '템플릿',
  reference: '참고자료',
  guideline: '가이드라인'
}

const typeLabels = {
  guide: '가이드',
  presentation: '프레젠테이션',
  video: '비디오',
  document: '문서',
  spreadsheet: '스프레드시트',
  template: '템플릿'
}

const categoryColors = {
  tutorial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  workshop: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  template: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  reference: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  guideline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

const typeIcons = {
  guide: BookOpen,
  presentation: Presentation,
  video: Video,
  document: FileText,
  spreadsheet: File,
  template: File
}

export default function ResourceDetailPage({ resourceId }: ResourceDetailPageProps) {
  const { user, isMember } = useAuthV2()
  const router = useRouter()
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  const interactionsV2 = useInteractionsV2()
  
  const { data: resourceData, isPending: loading, error } = contentV2.useContent(resourceId)
  const { data: interactionStats } = interactionsV2.useInteractionStats(resourceId, 'content')
  const { data: userInteractions } = interactionsV2.useUserInteractions(resourceId, 'content')
  
  // Derive interaction states
  const isLiked = (userInteractions as any)?.user_liked || false
  const likeCount = (interactionStats as any)?.likes || 0
  const isBookmarked = (userInteractions as any)?.user_bookmarked || false
  
  const downloadCount = useMemo(() => {
    // V2에서는 interaction_counts에서 다운로드 수를 가져옴
    return (resourceData as any)?.interaction_counts?.downloads || 0
  }, [resourceData])
  
  // Use mutation loading states
  const likeLoading = interactionsV2.isToggling
  const bookmarkLoading = interactionsV2.isToggling
  const deleteLoading = contentV2.isDeleting
  const updateLoading = contentV2.isUpdating

  // V2에서는 view count를 interaction으로 처리
  useEffect(() => {
    if (resourceData?.id) {
      // TODO: view interaction 추가 또는 별도 view count API 호출
    }
  }, [resourceData?.id])



  // Handle error state
  useEffect(() => {
    if (error) {
      console.error('Error loading resource:', error)
      toast.error('자료를 불러오는데 실패했습니다.')
    }
  }, [error])

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
        targetId: resourceId,
        targetType: 'content',
        interactionType: 'like'
      })
      toast.success(isLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error(error.message || '좋아요 처리에 실패했습니다.')
    }
  }

  const handleDownload = async () => {
    if (!resourceData) return
    
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }
    
    if (!isMember) {
      toast.error('동아리 회원만 자료를 다운로드할 수 있습니다.')
      return
    }

    try {
      // V2에서는 다운로드 이벤트를 interaction으로 처리
      // TODO: 다운로드 interaction 추가 
      
      // Handle download - V2에서는 다른 방식으로 URL 저장됨
      const resourceUrl = (resourceData as any)?.url || (resourceData as any)?.content_url
      if (resourceUrl) {
        window.open(resourceUrl, '_blank')
      } else {
        // V2에서는 파일 URL 구조가 다름
        const link = document.createElement('a')
        link.href = resourceUrl || '#'
        link.download = resourceData.title || 'download'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      toast.success('다운로드가 시작되었습니다.')
    } catch (error: any) {
      console.error('Error updating download count:', error)
      toast.error(error.message || '다운로드에 실패했습니다.')
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
        targetId: resourceId,
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
    router.push(`/resources/${resourceId}/edit`)
  }

  const handleDelete = async () => {
    if (!confirm('정말로 이 학습자료를 삭제하시겠습니까?')) {
      return
    }

    try {
      await contentV2.deleteContentAsync(resourceId)
      
      toast.success('학습자료가 삭제되었습니다.')
      router.push('/resources')
    } catch (error: any) {
      console.error('Error deleting resource:', error)
      toast.error(error.message || '학습자료 삭제에 실패했습니다.')
    }
  }


  if (loading || !resourceData) {
    return (
      <DetailLayout
        title={loading ? "로딩 중..." : "자료를 찾을 수 없습니다."}
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
        backLink="/resources"
        loading={loading}
      />
    )
  }

  // V2에서는 metadata가 별도 테이블에 있거나 content_type 필드 사용
  const TypeIcon = typeIcons['document' as keyof typeof typeIcons] || File

  return (
    <DetailLayout
      title={resourceData.title || ''}
      content={resourceData.content || ''}
      author={{
        id: resourceData.author?.id || resourceData.author_id || '',
        name: resourceData.author?.name || '익명',
        avatar: resourceData.author?.avatar_url || undefined,
        department: resourceData.author?.department || undefined
      }}
      createdAt={resourceData.created_at || new Date().toISOString()}
      viewCount={resourceData.interaction_counts?.views || 0}
      category={{
        label: categoryLabels['reference' as keyof typeof categoryLabels] || '자료',
        value: 'resource',
        color: categoryColors['reference' as keyof typeof categoryColors],
        icon: BookOpen
      }}
      tags={resourceData.tags || []}
      likeCount={likeCount}
      commentCount={resourceData.comment_count || 0}
      isLiked={isLiked}
      isBookmarked={isBookmarked}
      canEdit={!!(user && (user as any)?.id === resourceData.author_id)}
      canDelete={!!(user && ((user as any)?.id === resourceData.author_id || (user as any)?.id === resourceData.author?.id))}
      onLike={handleLike}
      onBookmark={handleBookmark}
      onShare={handleShare}
      onEdit={handleEdit}
      onDelete={handleDelete}
      additionalInfo={
        <>
          {/* Resource type badge */}
          <div className="mb-4">
            <Badge variant="outline">
              <TypeIcon className="mr-1 h-3 w-3" />
              {typeLabels['document' as keyof typeof typeLabels] || '자료'}
            </Badge>
          </div>

          {/* Resource info */}
          {downloadCount > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold">자료 정보</h4>
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">다운로드 횟수</span>
                  <span className="text-sm text-muted-foreground">{downloadCount}회</span>
                </div>
              </div>
            </div>
          )}
        </>
      }
      actionButtons={
        <Button 
          size="sm"
          onClick={handleDownload}
          disabled={!isMember}
          title={!isMember ? "동아리 회원만 다운로드할 수 있습니다" : ""}
          className="kepco-gradient gap-2 flex-shrink-0"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">다운로드</span>
        </Button>
      }
      backLink="/resources"
      backLinkText="학습자료 목록"
      loading={loading}
      likeLoading={likeLoading}
      deleteLoading={deleteLoading}
    >
      <CommentSection contentId={resourceId} />
    </DetailLayout>
  )
}