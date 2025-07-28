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
import api, { type ContentWithAuthorNonNull } from '@/lib/api.modern'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'



interface CaseDetailPageProps {
  caseId: string
}

export default function CaseDetailPage({ caseId }: CaseDetailPageProps) {
  const { user } = useAuth()
  const [caseData, setCaseData] = useState<ContentWithAuthorNonNull | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true)
        
        // First get the case data
        const caseResponse = await api.content.getContentById(caseId)
        
        if (caseResponse.error) {
          throw new Error(caseResponse.error)
        }
        
        if (caseResponse.data) {
          if (caseResponse.data.type !== 'case') {
            throw new Error('Content is not a case')
          }
          setCaseData(caseResponse.data)
          setLikeCount(caseResponse.data.like_count || 0)
          
          // If user is logged in, check interactions in parallel
          if (user) {
            const [likeResult, bookmarkResult] = await Promise.allSettled([
              api.interactions.checkInteraction(user.id, caseId, 'like'),
              api.interactions.checkInteraction(user.id, caseId, 'bookmark')
            ])
            
            if (likeResult.status === 'fulfilled' && likeResult.value.success && likeResult.value.data !== undefined) {
              setIsLiked(likeResult.value.data)
            }
            
            if (bookmarkResult.status === 'fulfilled' && bookmarkResult.value.success && bookmarkResult.value.data !== undefined) {
              setIsBookmarked(bookmarkResult.value.data)
            }
          }
        }
      } catch (error) {
        console.error('Error loading page data:', error)
        toast.error('게시글을 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    loadPageData()
  }, [caseId, user])


  const handleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const response = await api.interactions.toggleInteraction(
        user.id,
        caseId,
        'like'
      )
      
      if (response.error) {
        throw new Error(response.error)
      }
      
      if (response.data) {
        setIsLiked(response.data.isActive)
        setLikeCount(prevCount => response.data!.isActive ? prevCount + 1 : prevCount - 1)
      }
    } catch (error) {
      console.error('Error toggling like:', error)
      toast.error('좋아요 처리에 실패했습니다.')
    }
  }


  const handleBookmark = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const response = await api.interactions.toggleInteraction(
        user.id,
        caseId,
        'bookmark'
      )
      if (response.error) throw new Error(response.error)
      
      if (response.data) {
        setIsBookmarked(response.data.isActive)
        toast.success(response.data.isActive ? '북마크에 추가되었습니다.' : '북마크에서 제거되었습니다.')
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
      toast.error('북마크 처리에 실패했습니다.')
    }
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

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return '방금 전'
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInHours < 48) return '1일 전'
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
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
          <h1 className="text-2xl font-bold mb-4">게시글을 찾을 수 없습니다.</h1>
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
              {/* Category and Tags */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  업무효율화
                </Badge>
                <Badge variant="outline">자동화</Badge>
                {(caseData.tags || []).map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {caseData.title}
              </CardTitle>

              {/* Author and Meta Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={caseData.author_avatar || ''} alt={caseData.author_name || ''} />
                    <AvatarFallback>
                      {(caseData.author_name || 'U').charAt(0)}
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
                    <MessageCircle className="h-4 w-4" />
                    <span>{caseData.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Case Info */}
              <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">사용 도구</div>
                  <div className="mt-1">
                    {((caseData.metadata as any)?.ai_tools || []).map((tool: string) => (
                      <Badge key={tool} variant="secondary" className="mr-1">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">난이도</div>
                  <div className="mt-1 font-medium">중급</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">소요 시간</div>
                  <div className="mt-1 font-medium">{(caseData.metadata as any)?.time_required || '미정'}</div>
                </div>
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: caseData.content.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>

              {/* Attachments */}
              {(caseData.metadata as any)?.attachments && (caseData.metadata as any).attachments.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-semibold">첨부 파일</h3>
                  <div className="space-y-2">
                    {((caseData.metadata as any).attachments || []).map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                            <BookOpen className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">{attachment.name}</div>
                            <div className="text-sm text-muted-foreground">{attachment.size}</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          다운로드
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-between border-t pt-6">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    className={isLiked ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    좋아요 ({likeCount})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    공유
                  </Button>
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

                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    신고
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
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
          <CommentSection contentId={caseId} contentType="case" />
        </motion.div>

        {/* Related Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>관련 활용사례</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/cases/2" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      Claude를 활용한 문서 요약 자동화
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      긴 문서를 효율적으로 요약하는 방법
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">Claude</Badge>
                      <Badge variant="outline" className="text-xs">문서처리</Badge>
                    </div>
                  </div>
                </Link>
                
                <Link href="/cases/3" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      GitHub Copilot으로 코딩 효율성 2배 향상
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      개발 업무의 생산성을 크게 높인 사례
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">GitHub Copilot</Badge>
                      <Badge variant="outline" className="text-xs">개발</Badge>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postType="case"
        postId={caseId}
        title={caseData?.title}
      />
    </div>
  )
}

