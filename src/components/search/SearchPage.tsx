'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Search, 
  Calendar, 
  Eye, 
  MessageCircle,
  Heart,
  TrendingUp,
  Filter,
  ArrowRight,
  Clock,
  User,
  FileText,
  Lightbulb,
  BookOpen,
  HelpCircle,
  Coffee,
  AlertCircle,
  Bell,
  Info,
  Megaphone,
  Loader2
} from 'lucide-react'
import api from '@/lib/api.modern'
import { toast } from 'sonner'

const contentTypeLabels = {
  all: '전체',
  community: '커뮤니티',
  case: '활용사례',
  resource: '학습자료',
  announcement: '공지사항'
}

const contentTypeIcons = {
  community: MessageCircle,
  case: Lightbulb,
  resource: BookOpen,
  announcement: Bell
}

const categoryIcons = {
  // Community
  tips: Lightbulb,
  review: BookOpen,
  help: HelpCircle,
  discussion: MessageCircle,
  question: HelpCircle,
  chat: Coffee,
  // Announcements
  notice: AlertCircle,
  event: Bell,
  meeting: Megaphone,
  announcement: Info
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [activeTab, setActiveTab] = useState<'all' | 'community' | 'case' | 'resource' | 'announcement'>('all')
  const [searchResults, setSearchResults] = useState<any>({
    community: [],
    cases: [],
    resources: [],
    announcements: [],
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [popularSearches, setPopularSearches] = useState<string[]>([])

  // URL 업데이트
  const updateURL = useCallback((query: string) => {
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/search')
    }
  }, [router])

  // 검색 실행
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ community: [], cases: [], resources: [], announcements: [], total: 0 })
      return
    }

    try {
      setLoading(true)
      
      if (activeTab === 'all') {
        const response = await api.content.searchContent(query, ['post', 'case', 'resource', 'announcement'], 20)
        if (!response.success) throw new Error(response.error || 'Search failed')
        
        // Transform results into expected format
        const results = { community: [], cases: [], resources: [], announcements: [], total: 0 } as any
        if (response.data?.results) {
          response.data.results.forEach((item: any) => {
            switch (item.type) {
              case 'post':
                results.community.push(item)
                break
              case 'case':
                results.cases.push(item)
                break
              case 'resource':
                results.resources.push(item)
                break
              case 'announcement':
                results.announcements.push(item)
                break
            }
          })
          results.total = response.data.total || 0
        }
        setSearchResults(results)
      } else {
        const contentType = activeTab === 'community' ? 'post' : activeTab
        const response = await api.content.searchContent(query, [contentType as any], 20)
        if (!response.success) throw new Error(response.error || 'Search failed')
        
        // 결과를 적절한 카테고리에 배치
        const results = { community: [], cases: [], resources: [], announcements: [], total: 0 } as any
        const key = activeTab === 'case' ? 'cases' : activeTab === 'resource' ? 'resources' : activeTab === 'announcement' ? 'announcements' : activeTab
        results[key] = response.data?.results || []
        results.total = response.data?.total || 0
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('검색 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // 검색어 제안 가져오기
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      // Search suggestions not implemented in modern API yet
      // For now, just clear suggestions
      setSuggestions([])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    }
  }, [])

  // 인기 검색어 가져오기
  const fetchPopularSearches = useCallback(async () => {
    try {
      // Popular searches not implemented in modern API yet
      // For now, just use empty array
      setPopularSearches([])
    } catch (error) {
      console.error('Error fetching popular searches:', error)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    fetchPopularSearches()
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [searchParams, performSearch, fetchPopularSearches])

  // 검색어 변경 시 제안 가져오기
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchSuggestions(searchQuery)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, fetchSuggestions])

  // 탭 변경 시 검색 재실행
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery)
    }
  }, [activeTab, searchQuery, performSearch])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setShowSuggestions(false)
    updateURL(query)
    performSearch(query)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
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

  const getResultLink = (type: string, item: any) => {
    switch (type) {
      case 'community':
        return `/community/${item.id}`
      case 'case':
        return `/cases/${item.id}`
      case 'resource':
        return `/resources/${item.id}`
      case 'announcement':
        return `/announcements/${item.id}`
      default:
        return '#'
    }
  }

  const renderResultItem = (type: string, item: any, index: number) => {
    const TypeIcon = contentTypeIcons[type as keyof typeof contentTypeIcons]
    const CategoryIcon = categoryIcons[item.category as keyof typeof categoryIcons]
    
    return (
      <motion.div
        key={`${type}-${item.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card className="transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer">
          <Link href={getResultLink(type, item)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <TypeIcon className="mr-1 h-3 w-3" />
                      {contentTypeLabels[type as keyof typeof contentTypeLabels]}
                    </Badge>
                    {item.category && CategoryIcon && (
                      <Badge variant="outline" className="text-xs">
                        <CategoryIcon className="mr-1 h-3 w-3" />
                        {item.category}
                      </Badge>
                    )}
                    {item.is_pinned && (
                      <Badge variant="destructive" className="text-xs">
                        고정
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2 text-lg leading-tight hover:text-primary">
                    {item.title}
                  </CardTitle>
                </div>
                
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage 
                    src={item.profiles?.avatar_url || ''} 
                    alt={item.profiles?.name || ''} 
                  />
                  <AvatarFallback>
                    {item.profiles?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <CardDescription className="mb-4 line-clamp-2 text-sm leading-relaxed">
                {type === 'resource' ? item.description : item.content}
              </CardDescription>
              
              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  {item.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{item.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Meta information */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">{item.profiles?.name || '익명'}</span>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatRelativeTime(item.created_at)}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-3 w-3" />
                    <span>{item.views || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{item.comments_count || 0}</span>
                  </div>
                  {item.likes_count !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Heart className="h-3 w-3" />
                      <span>{item.likes_count}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </motion.div>
    )
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
            통합 검색
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            커뮤니티, 활용사례, 학습자료, 공지사항을 한번에 검색하세요
          </p>
        </motion.div>
      </div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8"
      >
        <div className="max-w-2xl mx-auto relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="검색어를 입력하세요..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery)
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-4 py-3 text-base"
            />
            <Button 
              onClick={() => handleSearch(searchQuery)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
              size="sm"
            >
              검색
            </Button>
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50">
              <CardContent className="p-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded"
                  >
                    <Search className="inline h-3 w-3 mr-2 text-muted-foreground" />
                    {suggestion}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Popular Searches */}
      {!searchQuery && popularSearches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>인기 검색어</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(search)}
                    className="text-sm"
                  >
                    <span className="mr-2 text-primary font-semibold">{index + 1}</span>
                    {search}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search Results */}
      {searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                &quot;{searchQuery}&quot; 검색 결과
              </h2>
              <p className="text-sm text-muted-foreground">
                {loading ? '검색 중...' : `총 ${searchResults.total}개의 결과를 찾았습니다`}
              </p>
            </div>
          </div>

          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                전체 ({searchResults.total})
              </TabsTrigger>
              <TabsTrigger value="community">
                커뮤니티 ({searchResults.community.length})
              </TabsTrigger>
              <TabsTrigger value="case">
                활용사례 ({searchResults.cases.length})
              </TabsTrigger>
              <TabsTrigger value="resource">
                학습자료 ({searchResults.resources.length})
              </TabsTrigger>
              <TabsTrigger value="announcement">
                공지사항 ({searchResults.announcements.length})
              </TabsTrigger>
            </TabsList>

            {/* Results Content */}
            <div className="mt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-lg">검색 중...</span>
                </div>
              ) : (
                <TabsContent value={activeTab} className="mt-0">
                  <div className="space-y-4">
                    {activeTab === 'all' ? (
                      // All results
                      <>
                        {[...searchResults.community, ...searchResults.cases, ...searchResults.resources, ...searchResults.announcements]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((item, index) => {
                            const type = searchResults.community.includes(item) ? 'community' :
                                        searchResults.cases.includes(item) ? 'case' :
                                        searchResults.resources.includes(item) ? 'resource' : 'announcement'
                            return renderResultItem(type, item, index)
                          })}
                      </>
                    ) : (
                      // Specific type results
                      <>
                        {(activeTab === 'community' ? searchResults.community :
                          activeTab === 'case' ? searchResults.cases :
                          activeTab === 'resource' ? searchResults.resources :
                          searchResults.announcements
                        ).map((item: any, index: number) => renderResultItem(activeTab === 'case' ? 'case' : activeTab === 'resource' ? 'resource' : activeTab, item, index))}
                      </>
                    )}

                    {/* Empty State */}
                    {searchResults.total === 0 && !loading && (
                      <div className="text-center py-12">
                        <div className="mb-4 text-6xl">🔍</div>
                        <h3 className="mb-2 text-xl font-semibold">
                          검색 결과가 없습니다
                        </h3>
                        <p className="mb-4 text-muted-foreground">
                          다른 검색어를 시도해보거나 인기 검색어를 참고해주세요
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSearchQuery('')
                            updateURL('')
                          }}
                        >
                          검색 초기화
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </motion.div>
      )}
    </div>
  )
}