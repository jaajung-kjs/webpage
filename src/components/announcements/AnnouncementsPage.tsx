'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  Calendar, 
  Eye, 
  MessageCircle,
  Pin,
  Bell,
  AlertCircle,
  Info,
  Megaphone,
  Plus
} from 'lucide-react'
import { announcementsApi } from '@/lib/api'

interface AnnouncementWithAuthor {
  id: string
  title: string
  content: string
  category: string
  priority: string
  is_pinned: boolean
  views: number
  comments_count: number
  tags: string[]
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    role: string
  } | null
}

const categoryLabels = {
  all: '전체',
  notice: '공지사항',
  event: '이벤트',
  meeting: '모임안내',
  announcement: '발표'
}

const priorityLabels = {
  all: '전체',
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

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<AnnouncementWithAuthor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [activePriority, setActivePriority] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    filterAnnouncements(searchTerm, activeCategory, activePriority)
  }, [searchTerm, activeCategory, activePriority, announcements])

  const fetchAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error } = await announcementsApi.getAll({
        limit: 100
      })

      if (error) throw error
      setAnnouncements(data || [])
      setFilteredAnnouncements(data || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
  }

  const handlePriorityChange = (priority: string) => {
    setActivePriority(priority)
  }

  const filterAnnouncements = (term: string, category: string, priority: string) => {
    let filtered = announcements

    if (term) {
      filtered = filtered.filter(announcement =>
        announcement.title.toLowerCase().includes(term.toLowerCase()) ||
        announcement.content.toLowerCase().includes(term.toLowerCase()) ||
        announcement.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(announcement => announcement.category === category)
    }

    if (priority !== 'all') {
      filtered = filtered.filter(announcement => announcement.priority === priority)
    }

    // Sort by pinned first, then by date (already handled by API)
    setFilteredAnnouncements(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            공지사항
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            동아리의 주요 소식과 공지사항을 확인하세요
          </p>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {loading ? '-' : announcements.filter(a => a.is_pinned).length}
                </div>
                <div className="text-sm text-muted-foreground">고정 공지</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {loading ? '-' : announcements.length}
                </div>
                <div className="text-sm text-muted-foreground">전체 공지</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '-' : announcements.filter(a => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(a.created_at) > weekAgo
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">이번 주</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? '-' : announcements.reduce((total, a) => total + (a.views || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">총 조회수</div>
              </CardContent>
            </Card>
          </div>
          
          <Button className="kepco-gradient">
            <Plus className="mr-2 h-4 w-4" />
            새 공지 작성
          </Button>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-8 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="공지사항 제목, 내용, 태그로 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
              <TabsList className="grid w-full grid-cols-5">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="w-full sm:w-48">
            <Tabs value={activePriority} onValueChange={handlePriorityChange}>
              <TabsList className="grid w-full grid-cols-4">
                {Object.entries(priorityLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </motion.div>

      {/* Results count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">
          {loading ? '로딩 중...' : `총 ${filteredAnnouncements.length}개의 공지사항이 있습니다`}
        </p>
      </motion.div>

      {/* Announcements List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="space-y-4"
      >
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-6 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-6 w-3/4 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex flex-wrap gap-1 mb-4">
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-12 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredAnnouncements.map((announcement, index) => {
          const CategoryIcon = categoryIcons[announcement.category as keyof typeof categoryIcons]
          
          return (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className={`transition-all hover:shadow-lg hover:-translate-y-1 ${
                announcement.is_pinned ? 'border-primary bg-primary/5' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {announcement.is_pinned && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            <Pin className="mr-1 h-3 w-3" />
                            고정
                          </Badge>
                        )}
                        <Badge 
                          variant="secondary" 
                          className={categoryColors[announcement.category as keyof typeof categoryColors]}
                        >
                          <CategoryIcon className="mr-1 h-3 w-3" />
                          {categoryLabels[announcement.category as keyof typeof categoryLabels]}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={priorityColors[announcement.priority as keyof typeof priorityColors]}
                        >
                          {priorityLabels[announcement.priority as keyof typeof priorityLabels]}
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-xl leading-tight hover:text-primary cursor-pointer">
                        <Link href={`/announcements/${announcement.id}`}>
                          {announcement.title}
                        </Link>
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={announcement.profiles?.avatar_url || ''} alt={announcement.profiles?.name || ''} />
                        <AvatarFallback>
                          {announcement.profiles?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed cursor-pointer hover:text-foreground">
                    <Link href={`/announcements/${announcement.id}`}>
                      {announcement.content}
                    </Link>
                  </CardDescription>
                  
                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {announcement.tags && announcement.tags.length > 0 ? (
                      <>
                        {announcement.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {announcement.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{announcement.tags.length - 3}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        태그 없음
                      </Badge>
                    )}
                  </div>

                  {/* Meta information */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{announcement.profiles?.name || '익명'}</span>
                        <span className="text-xs">({announcement.profiles?.role || '역할 없음'})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeTime(announcement.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{announcement.views || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{announcement.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Empty state */}
      {!loading && filteredAnnouncements.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 text-6xl">📢</div>
          <h3 className="mb-2 text-xl font-semibold">
            {announcements.length === 0 ? '아직 등록된 공지사항이 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {announcements.length === 0 ? '첫 번째 공지사항을 등록해보세요!' : '다른 검색어나 필터를 시도해보세요'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveCategory('all')
              setActivePriority('all')
              filterAnnouncements('', 'all', 'all')
            }}
          >
            {announcements.length === 0 ? '새로고침' : '전체 보기'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}