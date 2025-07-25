'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  BookOpen, 
  Video, 
  Download, 
  ExternalLink,
  Bot,
  FileText,
  Lightbulb,
  Cpu
} from 'lucide-react'
import { resourcesApi } from '@/lib/api'

interface ResourceWithAuthor {
  id: string
  title: string
  description: string
  category: string
  type: string
  url: string
  download_count: number
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
  tutorial: '튜토리얼',
  workshop: '워크샵 자료',
  template: '템플릿',
  reference: '참고자료',
  guideline: '가이드라인'
}

const typeIcons = {
  guide: BookOpen,
  presentation: FileText,
  video: Video,
  document: FileText,
  spreadsheet: FileText,
  template: Lightbulb
}

const categoryColors = {
  tutorial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  workshop: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  template: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  reference: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  guideline: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceWithAuthor[]>([])
  const [filteredResources, setFilteredResources] = useState<ResourceWithAuthor[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResources()
  }, [])

  useEffect(() => {
    filterResources(searchTerm, activeCategory)
  }, [searchTerm, activeCategory, resources])

  const fetchResources = async () => {
    try {
      setLoading(true)
      const { data, error } = await resourcesApi.getAll({
        limit: 100
      })

      if (error) throw error
      setResources(data || [])
      setFilteredResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
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

  const filterResources = (term: string, category: string) => {
    let filtered = resources

    if (term) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(term.toLowerCase()) ||
        resource.description.toLowerCase().includes(term.toLowerCase()) ||
        resource.tags?.some(tag => tag.toLowerCase().includes(term.toLowerCase()))
      )
    }

    if (category !== 'all') {
      filtered = filtered.filter(resource => resource.category === category)
    }

    setFilteredResources(filtered)
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
            학습자료
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI 도구 활용을 위한 다양한 학습자료와 가이드를 제공합니다
          </p>
        </motion.div>
      </div>

      {/* Quick Links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center p-6">
              <Bot className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">AI 도구</h3>
              <p className="text-xs text-muted-foreground text-center mt-1">
                ChatGPT, Claude 등
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center p-6">
              <Lightbulb className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">프롬프트</h3>
              <p className="text-xs text-muted-foreground text-center mt-1">
                효과적인 작성법
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center p-6">
              <Cpu className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">개발도구</h3>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Copilot, 코딩 AI
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex flex-col items-center p-6">
              <FileText className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold text-sm">업무활용</h3>
              <p className="text-xs text-muted-foreground text-center mt-1">
                실무 적용 사례
              </p>
            </CardContent>
          </Card>
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
            placeholder="자료 제목, 내용, 태그로 검색..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
          <TabsList className="grid w-full grid-cols-6">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
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
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground">
          {loading ? '로딩 중...' : `총 ${filteredResources.length}개의 학습자료가 있습니다`}
        </p>
      </motion.div>

      {/* Resources Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {loading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="h-full">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-10 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : filteredResources.map((resource, index) => {
          const TypeIcon = typeIcons[resource.type as keyof typeof typeIcons] || FileText
          
          return (
            <motion.div
              key={resource.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className={categoryColors[resource.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}
                    >
                      {categoryLabels[resource.category as keyof typeof categoryLabels] || resource.category}
                    </Badge>
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="line-clamp-2 text-xl leading-tight">
                    {resource.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                    {resource.description}
                  </CardDescription>
                  
                  {/* Tags */}
                  <div className="mb-4 flex flex-wrap gap-1">
                    {resource.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    )) || (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        태그 없음
                      </Badge>
                    )}
                    {(resource.tags?.length || 0) > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{(resource.tags?.length || 0) - 3}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <span className="font-medium">{resource.profiles?.name || '익명'}</span>
                    <div className="flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>{resource.download_count || 0}</span>
                    </div>
                  </div>

                  <Button asChild className="w-full kepco-gradient">
                    <Link href={resource.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      자료 보기
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Empty state */}
      {!loading && filteredResources.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="mb-4 text-6xl">📚</div>
          <h3 className="mb-2 text-xl font-semibold">
            {resources.length === 0 ? '아직 등록된 학습자료가 없습니다' : '검색 결과가 없습니다'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {resources.length === 0 ? '첫 번째 학습자료를 등록해보세요!' : '다른 검색어나 카테고리를 시도해보세요'}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setActiveCategory('all')
              filterResources('', 'all')
            }}
          >
            {resources.length === 0 ? '새로고침' : '전체 보기'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}