'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Eye, 
  MessageCircle,
  Heart,
  Share2,
  BookOpen,
  User,
  ArrowLeft,
  Send,
  ThumbsUp,
  Flag,
  MoreHorizontal,
  Edit,
  Trash2,
  Link as LinkIcon,
  Loader2,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import { 
  useContent,
  useIsLiked,
  useToggleLike
} from '@/hooks/useSupabase'
import { Views } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'



interface CaseDetailPageProps {
  caseId: string
}

export default function CaseDetailPage({ caseId }: CaseDetailPageProps) {
  const { user, isMember } = useAuth()
  
  // Use Supabase hooks
  const { data: caseData, loading, error } = useContent(caseId)
  const isLiked = useIsLiked(user?.id, caseId)
  const { toggleLike, loading: likeLoading } = useToggleLike()
  
  const [likeCount, setLikeCount] = useState(0)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{ type: 'content' | 'comment', id: string } | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [parentContentId, setParentContentId] = useState<string | undefined>()

  // Update like count when data changes
  useEffect(() => {
    if (caseData?.like_count) {
      setLikeCount(caseData.like_count)
    }
  }, [caseData])

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

    try {
      const result = await toggleLike(user.id, caseId)
      
      if (result.error) {
        throw result.error
      }
      
      // Update local like count
      setLikeCount(prev => isLiked ? prev - 1 : prev + 1)
      
      toast.success(isLiked ? '좋아요를 취소했습니다.' : '좋아요를 눌렀습니다.')
    } catch (error: any) {
      console.error('Error toggling like:', error)
      toast.error(error.message || '좋아요 처리에 실패했습니다.')
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getRoleLabel = (role: string) => {
    const roleLabels: { [key: string]: string } = {
      'leader': '동아리장',
      'vice_leader': '부동아리장',
      'executive': '운영진',
      'member': '일반회원',
      'admin': '관리자'
    }
    return roleLabels[role] || role
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-8">
              <div className="h-10 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">케이스를 찾을 수 없습니다.</h1>
          <Button asChild>
            <Link href="/cases">목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/cases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </Button>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="mb-4">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  성공사례
                </Badge>
              </div>

              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {caseData.title}
              </CardTitle>

              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={caseData.author_avatar || ''} alt={caseData.author_name || ''} />
                    <AvatarFallback>
                      {caseData.author_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{caseData.author_name || '익명'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(caseData.author_role || 'member')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {caseData.author_department || '부서 미지정'} • {caseData.created_at ? formatDate(caseData.created_at) : '날짜 없음'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{caseData.view_count || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{likeCount}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="prose max-w-none mb-8">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: (caseData.content || '').replace(/\n/g, '<br/>') 
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={isLiked ? "default" : "outline"} 
                    size="sm"
                    onClick={handleLike}
                    disabled={likeLoading || !isMember}
                    className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                    title={!isMember ? "동아리 회원만 좋아요를 누를 수 있습니다" : ""}
                  >
                    {likeLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    )}
                    좋아요 {likeCount > 0 && `(${likeCount})`}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    공유
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    setReportTarget({ type: 'content', id: caseId })
                    setReportDialogOpen(true)
                  }}>
                    <Flag className="mr-2 h-4 w-4" />
                    신고
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    variant={isBookmarked ? "default" : "outline"} 
                    size="sm"
                    onClick={handleBookmark}
                    className={isBookmarked ? "bg-blue-500 hover:bg-blue-600" : ""}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="mr-2 h-4 w-4 fill-current" />
                    ) : (
                      <Bookmark className="mr-2 h-4 w-4" />
                    )}
                    북마크
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <CommentSection contentId={caseId} />
        </motion.div>

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
      </div>
    </div>
  )
}
