'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  Calendar, 
  MessageSquare, 
  Eye, 
  ThumbsUp, 
  Filter,
  Plus,
  TrendingUp,
  Clock,
  Tag,
  BookOpen,
  Coffee,
  MessageCircle,
  HelpCircle,
  Loader2,
  X,
  MoreVertical,
  Edit,
  Trash2,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useContentList, useCreateContent, useDeleteContent } from '@/hooks/useSupabase'
import { useRouter } from 'next/navigation'
import { supabase, Views, TablesInsert } from '@/lib/supabase/client'

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
  tips: BookOpen,
  review: TrendingUp,
  help: HelpCircle,
  discussion: MessageCircle,
  question: HelpCircle,
  chat: Coffee
}

export default function CommunityPage() {
  const { user, profile } = useOptimizedAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('latest')
  
  // New post dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'chat',
    tags: [] as string[]
  })
  const [attachments, setAttachments] = useState<File[]>([])

  // Use Supabase hook for fetching content
  const { data: posts, loading, refetch } = useContentList({
    type: 'post',
    status: 'published'
  })
  const { createContent, loading: createLoading } = useCreateContent()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()

  // Filter and sort posts
  const filteredPosts = useMemo(() => {
    if (!posts) return []
    
    let filtered = [...posts]
    
    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(post => post.category === activeCategory)
    }
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(searchLower) ||
        post.content?.toLowerCase().includes(searchLower) ||
        post.author_name?.toLowerCase().includes(searchLower)
      )
    }
    
    // Sorting
    filtered.sort((a, b) => {
      const aIsPinned = (a.metadata as any)?.is_pinned || false
      const bIsPinned = (b.metadata as any)?.is_pinned || false
      
      if (aIsPinned && !bIsPinned) return -1
      if (!aIsPinned && bIsPinned) return 1
      
      switch (sortBy) {
        case 'popular':
          return (b.like_count || 0) - (a.like_count || 0)
        case 'views':
          return (b.view_count || 0) - (a.view_count || 0)
        case 'comments':
          return (b.comment_count || 0) - (a.comment_count || 0)
        case 'latest':
        default:
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      }
    })
    
    return filtered
  }, [posts, activeCategory, searchTerm, sortBy])

  const stats = {
    totalPosts: posts?.length || 0,
    todayPosts: posts?.filter(p => {
      const postDate = new Date(p.created_at || '')
      const today = new Date()
      return postDate.toDateString() === today.toDateString()
    }).length || 0,
    totalViews: posts?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0,
    totalComments: posts?.reduce((sum, p) => sum + (p.comment_count || 0), 0) || 0
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleCreatePost = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요.')
      return
    }

    if (!formData.content.trim()) {
      toast.error('내용을 입력해주세요.')
      return
    }

    try {
      const newPost: TablesInsert<'content'> = {
        type: 'post',
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        tags: formData.tags,
        author_id: user.id,
        status: 'published',
        metadata: {}
      }

      const result = await createContent(newPost)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      toast.success('게시글이 작성되었습니다.')
      setCreateDialogOpen(false)
      setFormData({
        title: '',
        content: '',
        category: 'chat',
        tags: []
      })
      refetch() // Refresh the post list
    } catch (error: any) {
      console.error('Error creating post:', error)
      toast.error(error.message || '게시글 작성에 실패했습니다.')
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">커뮤니티</h1>
          <p className="text-muted-foreground">동아리원들과 자유롭게 소통하세요</p>
        </div>
        {user && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            글쓰기
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 게시글</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              오늘 +{stats.todayPosts}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 조회수</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 댓글</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">고정 게시글</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '-' : posts?.filter(p => (p.metadata as any)?.is_pinned).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목, 내용, 작성자로 검색"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sortOptions).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {Object.entries(categoryLabels).map(([value, label]) => (
            <TabsTrigger key={value} value={value} className="min-w-fit">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">게시글을 불러오는 중...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">게시글이 없습니다</h3>
              <p className="text-muted-foreground">
                {searchTerm ? '검색 결과가 없습니다.' : '첫 번째 게시글을 작성해보세요!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const CategoryIcon = categoryIcons[post.category as keyof typeof categoryIcons] || Coffee
                const isPinned = (post.metadata as any)?.is_pinned
                
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className={`hover:shadow-lg transition-shadow ${isPinned ? 'border-primary bg-primary/5' : ''}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isPinned && (
                                <Badge variant="default" className="bg-primary">
                                  <Tag className="h-3 w-3 mr-1" />
                                  고정
                                </Badge>
                              )}
                              <Badge 
                                variant="secondary" 
                                className={categoryColors[post.category as keyof typeof categoryColors]}
                              >
                                <CategoryIcon className="h-3 w-3 mr-1" />
                                {categoryLabels[post.category as keyof typeof categoryLabels] || post.category}
                              </Badge>
                              {(post.metadata as any)?.has_image && (
                                <Badge variant="outline">
                                  이미지
                                </Badge>
                              )}
                              {(post.metadata as any)?.attachments && Array.isArray((post.metadata as any).attachments) && (post.metadata as any).attachments.length > 0 && (
                                <Badge variant="outline">
                                  📎 {(post.metadata as any).attachments.length}개 파일
                                </Badge>
                              )}
                            </div>
                            <Link href={`/community/${post.id}`}>
                              <CardTitle className="text-xl hover:text-primary cursor-pointer">
                                {post.title}
                              </CardTitle>
                            </Link>
                            <CardDescription className="line-clamp-2">
                              {post.excerpt}
                            </CardDescription>
                          </div>
                          {user && profile && (profile.role === 'admin' || profile.role === 'leader' || 
                           profile.role === 'vice-leader' || post.author_id === user.id) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {user.id === post.author_id && (
                                  <>
                                    <DropdownMenuItem onClick={() => toast.info('수정 기능은 준비 중입니다.')}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      수정
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
                                      return
                                    }
                                    if (!post.id) {
                                      toast.error('게시글 ID를 찾을 수 없습니다.')
                                      return
                                    }
                                    try {
                                      const result = await deleteContent(post.id)
                                      if (result.error) {
                                        throw result.error
                                      }
                                      toast.success('게시글이 삭제되었습니다.')
                                      refetch() // Refresh the list
                                    } catch (error: any) {
                                      console.error('Error deleting post:', error)
                                      toast.error(error.message || '게시글 삭제에 실패했습니다.')
                                    }
                                  }}
                                  disabled={deleteLoading}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={post.author_avatar_url || undefined} />
                                <AvatarFallback>{post.author_name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <span>{post.author_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(post.created_at || '').toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{post.view_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              <span>{post.like_count || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{post.comment_count || 0}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>새 게시글 작성</DialogTitle>
            <DialogDescription>
              커뮤니티에 새로운 글을 작성해보세요
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).filter(([key]) => key !== 'all').map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                제목
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="제목을 입력하세요"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.title.length}/100
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                내용
              </label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="내용을 입력하세요"
                rows={10}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.content.length}/5000
              </p>
            </div>

            {attachments.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">첨부파일</label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreatePost} disabled={createLoading}>
              {createLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              작성하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}