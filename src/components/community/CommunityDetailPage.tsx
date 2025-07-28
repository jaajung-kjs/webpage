'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Eye, 
  MessageCircle,
  Heart,
  Share2,
  BookOpen,
  ArrowLeft,
  Flag,
  MoreHorizontal,
  Coffee,
  Lightbulb,
  HelpCircle,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import api, { type ContentWithAuthorNonNull } from '@/lib/api.modern'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { ReportDialog } from '@/components/ui/report-dialog'
import CommentSection from '@/components/shared/CommentSection'

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
  const { user } = useAuth()
  const [postData, setPostData] = useState<ContentWithAuthorNonNull | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)



  // View count is incremented automatically by getContentById

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true)
        
        // First get the post data
        const postResponse = await api.content.getContentById(postId)
        
        if (postResponse.error) {
          throw new Error(postResponse.error)
        }
        
        if (postResponse.data) {
          if (postResponse.data.type !== 'post') {
            throw new Error('Content is not a community post')
          }
          setPostData(postResponse.data)
          setLikeCount(postResponse.data.like_count || 0)
          
          // If user is logged in, check interactions in parallel
          if (user) {
            const [likeResult, bookmarkResult] = await Promise.allSettled([
              api.interactions.checkInteraction(user.id, postId, 'like'),
              api.interactions.checkInteraction(user.id, postId, 'bookmark')
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
  }, [postId, user])

  const handleLike = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    try {
      const response = await api.interactions.toggleInteraction(
        user.id,
        postId,
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
        postId,
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

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    toast.success('링크가 클립보드에 복사되었습니다.')
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

  if (!postData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">게시글을 찾을 수 없습니다.</h1>
          <Button asChild>
            <Link href="/community">목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    )
  }

  const CategoryIcon = categoryIcons[postData.category as keyof typeof categoryIcons]

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
            <Link href="/community">
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
                <Badge 
                  variant="secondary" 
                  className={categoryColors[postData.category as keyof typeof categoryColors]}
                >
                  <CategoryIcon className="mr-1 h-3 w-3" />
                  {categoryLabels[postData.category as keyof typeof categoryLabels]}
                </Badge>
                {(postData.metadata as any)?.is_pinned && (
                  <Badge variant="destructive">
                    고정
                  </Badge>
                )}
                {postData.tags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {postData.title}
              </CardTitle>

              {/* Author and Meta Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={postData.author_avatar || ''} alt={postData.author_name || ''} />
                    <AvatarFallback>
                      {postData.author_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{postData.author_name || '익명'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(postData.author_role || 'member')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {postData.author_department || '부서 미지정'} • {postData.created_at ? formatDate(postData.created_at) : '날짜 없음'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{postData.view_count || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{postData.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Content */}
              <div className="prose max-w-none mb-8">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: postData.content.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>

              {/* Attachments */}
              {(postData.metadata as any)?.attachments && Array.isArray((postData.metadata as any).attachments) && (postData.metadata as any).attachments.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    첨부파일 ({(postData.metadata as any).attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {((postData.metadata as any).attachments || []).map((attachment: any, index: number) => {
                      if (!attachment || typeof attachment !== 'object') return null
                      const attachmentObj = attachment as any
                      const isImage = attachmentObj.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                      const fileSize = (attachmentObj.size / 1024).toFixed(1)
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded border">
                          <div className="flex items-center space-x-3">
                            {isImage ? (
                              <div className="flex-shrink-0">
                                <img 
                                  src={attachmentObj.url} 
                                  alt={attachmentObj.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                {attachmentObj.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {fileSize} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(attachmentObj.url, '_blank')}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            다운로드
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t pt-6">
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
                  <Button variant="outline" size="sm" onClick={handleShare}>
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
          <CommentSection contentId={postId} contentType="post" />
        </motion.div>
      </div>

      {/* Report Dialog */}
      <ReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postType="community"
        postId={postId}
        title={postData?.title}
      />
    </div>
  )
}

