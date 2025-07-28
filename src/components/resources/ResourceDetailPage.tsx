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
  ArrowLeft,
  Download,
  Eye,
  Share2,
  BookOpen,
  FileText,
  Video,
  Presentation,
  File,
  Calendar,
  User,
  ExternalLink,
  Heart,
  Bookmark,
  BookmarkCheck,
  Tag
} from 'lucide-react'
import api, { type ContentWithAuthorNonNull } from "@/lib/api.modern"
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

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
  const { user } = useAuth()
  const [resourceData, setResourceData] = useState<ContentWithAuthorNonNull | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [downloadCount, setDownloadCount] = useState(0)

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true)
        
        // First get the resource data
        const resourceResponse = await api.content.getContentById(resourceId)
        
        if (!resourceResponse.success) {
          throw new Error(resourceResponse.error || 'Failed to fetch resource')
        }
        
        if (resourceResponse.data) {
          if (resourceResponse.data.type !== 'resource') {
            throw new Error('Content is not a resource')
          }
          setResourceData(resourceResponse.data)
          const metadata = resourceResponse.data.metadata as any
          setDownloadCount(metadata?.downloads || 0)
          
          // If user is logged in, check bookmark status
          if (user) {
            const bookmarkResponse = await api.interactions.checkInteraction(
              user.id,
              resourceId,
              'bookmark'
            )
            if (bookmarkResponse.data !== undefined) {
              setIsBookmarked(bookmarkResponse.data)
            }
          }
        }
      } catch (error) {
        console.error('Error loading page data:', error)
        toast.error('자료를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }
    
    loadPageData()
  }, [resourceId, user])

  const handleDownload = async () => {
    if (!resourceData) return

    try {
      // Update download count in metadata
      const metadata = resourceData.metadata as any
      const newMetadata = {
        ...metadata,
        downloads: (metadata?.downloads || 0) + 1
      }
      
      const response = await api.content.updateContent(resourceId, {
        metadata: newMetadata
      })
      
      if (!response.success) {
        console.error('Update download count failed:', response.error)
        throw new Error(response.error || 'Failed to update download count')
      }
      
      setDownloadCount(prev => prev + 1)

      // Handle download based on resource type
      if (metadata?.url) {
        // External URL
        window.open(metadata.url, '_blank')
        toast.success('외부 링크로 이동합니다.')
      } else if (metadata?.file_path) {
        // File download
        toast.info('파일 다운로드 기능은 준비 중입니다.')
      } else {
        toast.error('다운로드할 수 있는 자료가 없습니다.')
      }
    } catch (error) {
      console.error('Error handling download:', error)
      toast.error('다운로드 처리에 실패했습니다.')
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
        resourceId,
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

  if (!resourceData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">자료를 찾을 수 없습니다.</h1>
          <Button asChild>
            <Link href="/resources">목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    )
  }

  const metadata = (resourceData.metadata || {}) as any
  const TypeIcon = typeIcons[metadata?.type as keyof typeof typeIcons] || File

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
            <Link href="/resources">
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
              {/* Category and Type */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge 
                  variant="secondary" 
                  className={categoryColors[resourceData.category as keyof typeof categoryColors]}
                >
                  {categoryLabels[resourceData.category as keyof typeof categoryLabels]}
                </Badge>
                <Badge variant="outline">
                  <TypeIcon className="mr-1 h-3 w-3" />
                  {typeLabels[metadata?.type as keyof typeof typeLabels] || '자료'}
                </Badge>
                {resourceData.tags?.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {resourceData.title}
              </CardTitle>

              {/* Author and Meta Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={resourceData.author_avatar || ''} alt={resourceData.author_name || ''} />
                    <AvatarFallback>
                      {resourceData.author_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{resourceData.author_name || '익명'}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(resourceData.author_role || 'member')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {resourceData.author_department || '부서 미지정'} • {resourceData.created_at ? formatDate(resourceData.created_at) : '날짜 없음'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Download className="h-4 w-4" />
                    <span>{downloadCount}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Description */}
              <div className="prose max-w-none mb-8">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: resourceData.content.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>

              {/* Resource Info */}
              <div className="mb-8 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">카테고리</div>
                  <div className="mt-1 font-medium">
                    {categoryLabels[resourceData.category as keyof typeof categoryLabels]}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">파일 형식</div>
                  <div className="mt-1 font-medium">
                    {typeLabels[metadata?.type as keyof typeof typeLabels] || '자료'}
                  </div>
                </div>
              </div>

              {/* Download Section */}
              <div className="mb-8 rounded-lg border p-6 text-center">
                <TypeIcon className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">자료 다운로드</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {metadata?.url ? '외부 링크로 이동합니다' : '파일을 다운로드할 수 있습니다'}
                </p>
                <Button 
                  onClick={handleDownload}
                  className="kepco-gradient"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {metadata?.url ? '링크 열기' : '다운로드'}
                </Button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t pt-6">
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Related Resources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>관련 자료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/resources" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      AI 활용 가이드라인
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      AI 도구 사용 시 참고할 수 있는 가이드라인
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">가이드라인</Badge>
                      <Badge variant="outline" className="text-xs">PDF</Badge>
                    </div>
                  </div>
                </Link>
                
                <Link href="/resources" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      프롬프트 작성 템플릿
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      효과적인 프롬프트 작성을 위한 템플릿
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">템플릿</Badge>
                      <Badge variant="outline" className="text-xs">문서</Badge>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}