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
  Heart,
  Pin,
  Plus,
  Filter,
  ThumbsUp,
  Share2,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Coffee,
  TrendingUp
} from 'lucide-react'
import { communityApi } from '@/lib/api'

interface CommunityPostWithAuthor {
  id: string
  title: string
  content: string
  category: string
  views: number
  likes_count: number
  comments_count: number
  is_pinned: boolean
  has_image: boolean
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
  tips: '꿀팁공유',
  review: '후기',
  help: '도움요청',
  discussion: '토론',
  question: '질문',
  chat: '잡담'
}

const sortOptions = {
  latest: '최신순',
  popular: '인기순',
  views: '조회순',
  comments: '댓글순'
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

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPostWithAuthor[]>([])
  const [filteredPosts, setFilteredPosts] = useState<CommunityPostWithAuthor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    filterPosts(searchTerm, activeCategory, sortBy)
  }, [searchTerm, activeCategory, sortBy, posts])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await communityApi.getAll({
        limit: 100
      })

      if (error) throw error
      setPosts(data || [])
      setFilteredPosts(data || [])
    } catch (error) {
      console.error('Error fetching community posts:', error)
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

  const handleSortChange = (sort: string) => {
    setSortBy(sort)
  }

  const filterPosts = (term: string, category: string, sort: string) => {
    let filtered = posts

    if (term) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(term.toLowerCase()) ||
        post.content.toLowerCase().includes(term.toLowerCase()) ||
        post.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(post => post.category === category)
    }

    // Sort posts
    filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      
      switch (sort) {
        case 'popular':
          return (b.likes_count || 0) - (a.likes_count || 0)
        case 'views':
          return (b.views || 0) - (a.views || 0)
        case 'comments':
          return (b.comments_count || 0) - (a.comments_count || 0)
        case 'latest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFilteredPosts(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
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
            자유게시판
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            동아리원들과 AI 활용 경험과 일상을 자유롭게 나누어보세요
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
                <div className="text-2xl font-bold text-primary">
                  {loading ? '-' : posts.length}
                </div>
                <div className="text-sm text-muted-foreground">전체 게시글</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '-' : posts.filter(p => {
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return new Date(p.created_at) > weekAgo
                  }).reduce((total, p) => total + (p.comments_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">이번 주 댓글</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? '-' : posts.reduce((total, p) => total + (p.views || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">총 조회수</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '-' : posts.filter(p => p.is_pinned).length}
                </div>
                <div className="text-sm text-muted-foreground">고정 게시글</div>
              </CardContent>
            </Card>
          </div>
          
          <Button className="kepco-gradient">
            <Plus className="mr-2 h-4 w-4" />
            새 글 작성
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
            placeholder="제목, 내용, 태그로 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          
          <div className="overflow-x-auto">
            <Tabs value={sortBy} onValueChange={handleSortChange}>
              <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {Object.entries(sortOptions).map(([key, label]) => (
                  <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
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
          {loading ? '로딩 중...' : `총 ${filteredPosts.length}개의 게시글이 있습니다`}
        </p>
      </motion.div>

      {/* Posts List */}
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
        ) : filteredPosts.map((post, index) => {
          const CategoryIcon = categoryIcons[post.category as keyof typeof categoryIcons]
          
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className={`transition-all hover:shadow-lg hover:-translate-y-1 ${
                post.is_pinned ? 'border-primary bg-primary/5' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        {post.is_pinned && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
                            <Pin className="mr-1 h-3 w-3" />
                            고정
                          </Badge>
                        )}
                        <Badge 
                          variant="secondary" 
                          className={categoryColors[post.category as keyof typeof categoryColors]}
                        >
                          <CategoryIcon className="mr-1 h-3 w-3" />
                          {categoryLabels[post.category as keyof typeof categoryLabels]}
                        </Badge>
                        {post.has_image && (
                          <Badge variant="outline" className="text-xs">
                            📷 이미지
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 text-xl leading-tight hover:text-primary cursor-pointer">
                        <Link href={`/community/${post.id}`}>
                          {post.title}
                        </Link>
                      </CardTitle>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.profiles?.avatar_url || ''} alt={post.profiles?.name || ''} />
                        <AvatarFallback>
                          {post.profiles?.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed cursor-pointer hover:text-foreground">
                    <Link href={`/community/${post.id}`}>
                      {post.content}
                    </Link>
                  </CardDescription>
                  
                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {post.tags && post.tags.length > 0 ? (
                      <>
                        {post.tags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                        {post.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 4}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        태그 없음
                      </Badge>
                    )}
                  </div>

                  {/* Post Meta */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">{post.profiles?.name || '익명'}</span>
                        <span className="text-xs">({post.profiles?.role || '역할 없음'})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeTime(post.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{post.views || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likes_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="hover:text-red-500">
                        <Heart className="mr-1 h-4 w-4" />
                        좋아요
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="mr-1 h-4 w-4" />
                        댓글
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="mr-1 h-4 w-4" />
                        공유
                      </Button>
                    </div>
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/community/${post.id}`}>
                        자세히 보기
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Hot Topics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12"
      >
        <div className="mb-6 flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">인기 토픽</h2>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['ChatGPT', 'Claude', '업무효율', 'GitHub Copilot', 'Midjourney', '프롬프트', 'AI윤리', '점심메뉴'].map((topic) => (
            <Badge 
              key={topic} 
              variant="secondary" 
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => handleSearch(topic)}
            >
              #{topic}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Empty state */}
      {!loading && filteredPosts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="mb-2 text-xl font-semibold">
            {posts.length === 0 ? '아직 등록된 게시글이 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {posts.length === 0 ? '첫 번째 게시글을 등록해보세요!' : '다른 검색어나 카테고리를 시도해보세요'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveCategory('all')
              setSortBy('latest')
              filterPosts('', 'all', 'latest')
            }}
          >
            {posts.length === 0 ? '새로고침' : '전체 보기'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}