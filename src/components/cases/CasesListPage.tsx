'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, ThumbsUp, MessageCircle, Eye, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useContentList, useDeleteContent } from '@/hooks/useSupabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Views, type Enums } from '@/lib/supabase/client'

type PostCategory = Enums<'post_category'>

const categoryLabels = {
  all: '전체',
  productivity: '생산성 향상',
  creativity: '창의적 활용',
  development: '개발',
  analysis: '분석',
  other: '기타'
}

const categoryColors = {
  productivity: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  creativity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  development: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
}

export default function CasesListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all')
  const { user, profile } = useAuth()
  const router = useRouter()
  const { deleteContent, loading: deleteLoading } = useDeleteContent()
  
  // Use Supabase hook
  const { data: cases, loading } = useContentList({
    type: 'case',
    category: activeCategory !== 'all' ? activeCategory : undefined,
    status: 'published'
  })
  
  // Filter cases based on search term
  const filteredCases = useMemo(() => {
    if (!cases) return []
    if (!searchTerm) return cases
    
    const lowerSearch = searchTerm.toLowerCase()
    return cases.filter(item => 
      item.title?.toLowerCase().includes(lowerSearch) ||
      item.content?.toLowerCase().includes(lowerSearch) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowerSearch))
    )
  }, [cases, searchTerm])



  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI 활용사례
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              동료들이 공유한 다양한 AI 활용 경험을 확인해보세요
            </p>
          </div>
          {user && (
            <Button className="kepco-gradient" asChild>
              <Link href="/cases/new">
                <Plus className="mr-2 h-4 w-4" />
                사례 공유하기
              </Link>
            </Button>
          )}
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="사례 제목, 내용, 태그로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="overflow-x-auto">
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as PostCategory | 'all')}>
            <TabsList className="inline-flex h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="whitespace-nowrap px-3 py-1.5 text-xs font-medium">
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Results count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">
          {loading ? '로딩 중...' : `총 ${filteredCases.length}개의 활용사례가 있습니다`}
        </p>
      </motion.div>

      {/* Posts Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="flex space-x-3">
                    <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredCases.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground mb-4">검색 결과가 없습니다.</p>
            {user && (
              <Button className="kepco-gradient" asChild>
                <Link href="/cases/new">
                  <Plus className="mr-2 h-4 w-4" />
                  첫 번째 사례를 공유해보세요!
                </Link>
              </Button>
            )}
          </div>
        ) : (
          filteredCases.map((caseItem, index) => (
            <motion.div
              key={caseItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={categoryColors[caseItem.category as keyof typeof categoryColors] || ''}
                    >
                      {categoryLabels[caseItem.category as keyof typeof categoryLabels] || caseItem.category}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {caseItem.created_at ? new Date(caseItem.created_at).toLocaleDateString('ko-KR') : '날짜 없음'}
                      </span>
                      {user && profile && (profile.role === 'admin' || profile.role === 'leader' || 
                       profile.role === 'vice-leader' || caseItem.author_id === user.id) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.id === caseItem.author_id && (
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
                                if (!confirm('정말로 이 활용사례를 삭제하시겠습니까?')) {
                                  return
                                }
                                if (!caseItem.id) {
                                  toast.error('활용사례 ID를 찾을 수 없습니다.')
                                  return
                                }
                                try {
                                  const result = await deleteContent(caseItem.id)
                                  if (result.error) {
                                    throw result.error
                                  }
                                  toast.success('활용사례가 삭제되었습니다.')
                                  window.location.reload() // Refresh the list
                                } catch (error: any) {
                                  console.error('Error deleting case:', error)
                                  toast.error(error.message || '활용사례 삭제에 실패했습니다.')
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
                  </div>
                  <CardTitle className="line-clamp-2 text-xl leading-tight">
                    <Link 
                      href={`/cases/${caseItem.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {caseItem.title || '제목 없음'}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                    {caseItem.excerpt || (caseItem.content ? caseItem.content.substring(0, 150) + '...' : '')}
                  </CardDescription>
                  
                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {caseItem.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {(caseItem.tags?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(caseItem.tags?.length || 0) - 3}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{caseItem.author_name || '익명'}</span>
                      <span>·</span>
                      <span>{caseItem.author_department || '부서 미지정'}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{caseItem.view_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{caseItem.like_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{caseItem.comment_count || 0}</span>
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          ))
        )}
      </motion.div>
    </div>
  )
}