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
import { useContent, useToggleLike, useDeleteContent, useIsLiked, useUpdateContent, useIncrementView } from '@/hooks/features/useContent'
import { useIsBookmarked, useToggleBookmark } from '@/hooks/features/useBookmarks'
import { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'
import { useAuth } from '@/providers'
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
  const { user, profile, isMember } = useAuth()
  const router = useRouter()
  
  // Use hooks
  const { data: resourceData, isLoading: loading, error } = useContent(resourceId)
  const { data: isLikedFromHook } = useIsLiked(resourceId)
  const toggleLikeMutation = useToggleLike()
  const updateContentMutation = useUpdateContent()
  const deleteContentMutation = useDeleteContent()
  const incrementViewMutation = useIncrementView()
  
  // Derive like state from query data
  const isLiked = isLikedFromHook || false
  const likeCount = resourceData?.like_count || 0
  const downloadCount = useMemo(() => {
    if (resourceData?.metadata) {
      const metadata = resourceData.metadata as any
      return metadata?.downloads || 0
    }
    return 0
  }, [resourceData])
  
  // Use bookmark hooks
  const { data: isBookmarkedData } = useIsBookmarked(resourceId)
  const toggleBookmarkMutation = useToggleBookmark()
  
  // Use mutation loading states
  const likeLoading = toggleLikeMutation.isPending
  const deleteLoading = deleteContentMutation.isPending
  const updateLoading = updateContentMutation.isPending
  const bookmarkLoading = toggleBookmarkMutation.isPending

  // Increment view count when resource is loaded
  useEffect(() => {
    if (resourceData?.id) {
      incrementViewMutation.mutate(resourceData.id)
    }
  }, [resourceData?.id])



  // Handle error state
  useEffect(() => {
    if (error) {
      console.error('Error loading resource:', error)
      toast.error('자료를 불러오는데 실패했습니다.')
    }
  }, [error])

  // Bookmark state is now managed by the hook
  const isBookmarked = isBookmarkedData || false

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
      const isNowLiked = await toggleLikeMutation.mutateAsync(resourceId)
      toast.success(isNowLiked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.')
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
      // Update download count in metadata
      const metadata = resourceData.metadata as any
      const newMetadata = {
        ...metadata,
        downloads: (metadata?.downloads || 0) + 1
      }
      
      await updateContentMutation.mutateAsync({
        id: resourceId,
        updates: {
          metadata: newMetadata
        }
      })

      // Handle download based on resource type
      if (metadata?.url) {
        window.open(metadata.url, '_blank')
      } else if (metadata?.file_url) {
        const link = document.createElement('a')
        link.href = metadata.file_url
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
    if (bookmarkLoading) return
    
    try {
      await toggleBookmarkMutation.mutateAsync(resourceId)
    } catch (error) {
      // Error is handled by the mutation hook
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
      await deleteContentMutation.mutateAsync({ id: resourceId, contentType: 'resource' })
      
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

  const metadata = (resourceData.metadata || {}) as any
  const TypeIcon = typeIcons[metadata?.type as keyof typeof typeIcons] || File

  return (
    <DetailLayout
      title={resourceData.title || ''}
      content={resourceData.content || ''}
      author={{
        id: resourceData.author_id || '',
        name: resourceData.author_name || '익명',
        avatar: resourceData.author_avatar_url || undefined,
        department: resourceData.author_department || undefined
      }}
      createdAt={resourceData.created_at || new Date().toISOString()}
      viewCount={resourceData.view_count || 0}
      category={{
        label: categoryLabels[resourceData.category as keyof typeof categoryLabels] || '자료',
        value: resourceData.category || 'resource',
        color: categoryColors[resourceData.category as keyof typeof categoryColors],
        icon: BookOpen
      }}
      tags={resourceData.tags || []}
      likeCount={likeCount}
      commentCount={resourceData.comment_count || 0}
      isLiked={isLiked}
      isBookmarked={isBookmarked}
      canEdit={!!(user && user.id === resourceData.author_id)}
      canDelete={!!(user && (user.id === resourceData.author_id || ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')))}
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
              {typeLabels[metadata?.type as keyof typeof typeLabels] || '자료'}
            </Badge>
          </div>

          {/* Resource info */}
          {(metadata?.url || metadata?.file_url) && (
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