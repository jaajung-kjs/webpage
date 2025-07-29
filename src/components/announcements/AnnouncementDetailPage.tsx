'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Eye, 
  MessageCircle,
  ArrowLeft,
  Bell,
  AlertCircle,
  Info,
  Megaphone,
  Pin,
  Share2,
  Flag,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import { supabase, Views } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import PermissionGate from '@/components/shared/PermissionGate'

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
  const { user } = useAuth()
  const [announcementData, setAnnouncementData] = useState<Views<'content_with_author'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const fetchAnnouncementDetail = async () => {
    try {
      setLoading(true)
      
      // Get the announcement data
      const { data, error } = await supabase
        .from('content_with_author')
        .select('*')
        .eq('id', announcementId)
        .eq('type', 'announcement')
        .single()
      
      if (error) throw error
      
      if (data) {
        setAnnouncementData(data)
        
        // Increment view count
        await supabase
          .from('content')
          .update({ 
            view_count: (data.view_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', announcementId)
      }
    } catch (error) {
      console.error('Error fetching announcement detail:', error)
      toast.error('공지사항을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // View count is automatically incremented by getContentById

  useEffect(() => {
    fetchAnnouncementDetail()
  }, [announcementId])

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
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`
    return formatDate(dateString)
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

  if (!announcementData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">공지사항을 찾을 수 없습니다.</h1>
          <Button asChild>
            <Link href="/announcements">목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    )
  }

  const CategoryIcon = categoryIcons[announcementData.category as keyof typeof categoryIcons] || categoryIcons.notice
  const metadata = announcementData.metadata as any || {}

  return (
    <PermissionGate requireMember={true}>
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
            <Link href="/announcements">
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
          <Card className={metadata.is_pinned ? 'border-primary' : ''}>
            <CardHeader>
              {/* Category, Priority and Tags */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {metadata.is_pinned && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                    <Pin className="mr-1 h-3 w-3" />
                    고정
                  </Badge>
                )}
                <Badge 
                  variant="secondary" 
                  className={categoryColors[announcementData.category as keyof typeof categoryColors] || ''}
                >
                  <CategoryIcon className="mr-1 h-3 w-3" />
                  {categoryLabels[announcementData.category as keyof typeof categoryLabels] || '공지사항'}
                </Badge>
                <Badge 
                  variant="outline"
                  className={priorityColors[metadata.priority as keyof typeof priorityColors] || ''}
                >
                  {priorityLabels[metadata.priority as keyof typeof priorityLabels] || '일반'}
                </Badge>
                {announcementData.tags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {(announcementData as any).title}
              </CardTitle>

              {/* Author and Meta Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={(announcementData as any).profiles?.avatar_url || ''} alt={(announcementData as any).profiles?.name || ''} />
                    <AvatarFallback>
                      {(announcementData as any).profiles?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{(announcementData as any).profiles?.name || '익명'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel((announcementData as any).profiles?.role || 'member')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(announcementData as any).profiles?.department || '부서 미지정'} • {(announcementData as any).created_at ? formatDate((announcementData as any).created_at) : '날짜 없음'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{announcementData.view_count || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{announcementData.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Priority Notice */}
              {metadata.priority === 'high' && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-800 dark:text-red-300">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">중요 공지사항</span>
                  </div>
                  <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                    이 공지사항은 중요도가 높은 내용입니다. 반드시 확인해주세요.
                  </p>
                </div>
              )}

              {/* Content */}
              <div className="prose max-w-none mb-8">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: announcementData.content?.replace(/\n/g, '<br/>') || '' 
                  }}
                />
              </div>

              {/* Updated Date if exists */}
              {announcementData.updated_at && announcementData.updated_at !== announcementData.created_at && (
                <div className="mb-6 text-sm text-muted-foreground">
                  <span>마지막 수정: {formatDate(announcementData.updated_at)}</span>
                </div>
              )}

              <Separator className="my-6" />

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
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
                  <Button variant="ghost" size="sm">
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

        {/* Related Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>관련 공지사항</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                관련 공지사항이 없습니다.
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
    </PermissionGate>
  )
}