'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus, ThumbsUp, MessageCircle, Eye } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { casesApi } from '@/lib/api'

interface CaseWithAuthor {
  id: string
  title: string
  content: string
  category: string
  subcategory: string | null
  author_id: string
  views: number
  likes_count: number
  comments_count: number
  tags: string[]
  tools: string[]
  difficulty: string
  time_required: string | null
  is_featured: boolean
  created_at: string
  updated_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    role: string
    department: string | null
  } | null
}

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
  const [cases, setCases] = useState<CaseWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const { user } = useAuth()

  useEffect(() => {
    fetchCases()
  }, [searchTerm, activeCategory])

  const fetchCases = async () => {
    try {
      setLoading(true)
      const { data, error } = await casesApi.getAll({
        category: activeCategory === 'all' ? undefined : activeCategory,
        search: searchTerm || undefined,
        sortBy: 'latest',
        limit: 50
      })

      if (error) throw error
      setCases(data || [])
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDescription = (content: string) => {
    // Remove markdown and get first 150 characters
    const plainText = content.replace(/[#*`]/g, '').replace(/\n/g, ' ')
    return plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText
  }


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

        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-6 sm:gap-0">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="text-xs px-2">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Results count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">
          {loading ? '로딩 중...' : `총 ${cases.length}개의 활용사례가 있습니다`}
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
        ) : cases.length === 0 ? (
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
          cases.map((caseItem, index) => (
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
                      className={categoryColors[caseItem.category as keyof typeof categoryColors]}
                    >
                      {categoryLabels[caseItem.category as keyof typeof categoryLabels]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-2 text-xl leading-tight">
                    <Link 
                      href={`/cases/${caseItem.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      {caseItem.title}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                    {getDescription(caseItem.content)}
                  </CardDescription>
                  
                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {caseItem.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {caseItem.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{caseItem.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{caseItem.profiles?.name || '익명'}</span>
                      <span>·</span>
                      <span>{caseItem.profiles?.department || '미상'}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{caseItem.views}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{caseItem.likes_count}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{caseItem.comments_count}</span>
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