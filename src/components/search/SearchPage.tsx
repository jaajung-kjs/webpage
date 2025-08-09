'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { toast } from 'sonner'
import { useSearchV2 } from '@/hooks/features/useSearchV2'

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
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Use V2 hooks
  const searchV2 = useSearchV2()
  
  const { data: searchData, isPending: loading } = searchV2.useContentSearch(debouncedQuery, {
    contentType: activeTab === 'community' ? 'community' : activeTab
  })
  
  // Extract results from infinite query structure
  const searchResults = searchData?.pages.flatMap(page => page.results) || []
  const { data: popularSearches = [] } = searchV2.usePopularSearches()
  const recentSearches = searchV2.searchHistory.slice(0, 10) || []

  // URL 업데이트
  const updateURL = useCallback((query: string) => {
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/search')
    }
  }, [router])

  // Transform search results into categorized format
  const categorizedResults = useMemo(() => {
    const results = { community: [], cases: [], resources: [], announcements: [], total: 0 } as any
    
    if (searchResults && Array.isArray(searchResults)) {
      searchResults.forEach((item: any) => {
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
      results.total = searchResults.length
    }
    
    return results
  }, [searchResults])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 초기 로드
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      setDebouncedQuery(query)
    }
  }, [searchParams])

  // Get search suggestions from recent searches
  useEffect(() => {
    if (searchQuery.length >= 2 && recentSearches.length > 0) {
      const filtered = recentSearches
        .filter(s => s.query.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .map(s => s.query)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }, [searchQuery, recentSearches])

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      toast.error('검색어를 입력해주세요')
      return
    }
    setSearchQuery(query)
    setDebouncedQuery(query)
    setShowSuggestions(false)
    updateURL(query)
    // Search history is automatically managed by useSearchV2
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
                    <span>{item.interaction_counts?.views || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-3 w-3" />
                    <span>{item.comment_count || 0}</span>
                  </div>
                  {item.interaction_counts?.likes !== undefined && (
                    <div className="flex items-center space-x-1">
                      <Heart className="h-3 w-3" />
                      <span>{item.interaction_counts?.likes}</span>
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  검색 중...
                </>
              ) : (
                '검색'
              )}
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
                    onClick={() => handleSearch(search.query)}
                    className="text-sm"
                  >
                    <span className="mr-2 text-primary font-semibold">{index + 1}</span>
                    {search.query}
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
                {loading ? '검색 중...' : `총 ${categorizedResults.total}개의 결과를 찾았습니다`}
              </p>
            </div>
          </div>

          {/* Content Type Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="mb-6">
            <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground overflow-x-auto">
              <TabsTrigger
                value="all"
                className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center whitespace-nowrap"
              >
                전체 ({categorizedResults.total})
              </TabsTrigger>
              <TabsTrigger
                value="community"
                className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center whitespace-nowrap"
              >
                커뮤니티 ({categorizedResults.community.length})
              </TabsTrigger>
              <TabsTrigger
                value="case"
                className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center whitespace-nowrap"
              >
                활용사례 ({categorizedResults.cases.length})
              </TabsTrigger>
              <TabsTrigger
                value="resource"
                className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center whitespace-nowrap"
              >
                학습자료 ({categorizedResults.resources.length})
              </TabsTrigger>
              <TabsTrigger
                value="announcement"
                className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center whitespace-nowrap"
              >
                공지사항 ({categorizedResults.announcements.length})
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
                        {[...categorizedResults.community, ...categorizedResults.cases, ...categorizedResults.resources, ...categorizedResults.announcements]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((item, index) => {
                            const type = categorizedResults.community.includes(item) ? 'community' :
                                        categorizedResults.cases.includes(item) ? 'case' :
                                        categorizedResults.resources.includes(item) ? 'resource' : 'announcement'
                            return renderResultItem(type, item, index)
                          })}
                      </>
                    ) : (
                      // Specific type results
                      <>
                        {(activeTab === 'community' ? categorizedResults.community :
                          activeTab === 'case' ? categorizedResults.cases :
                          activeTab === 'resource' ? categorizedResults.resources :
                          categorizedResults.announcements
                        ).map((item: any, index: number) => renderResultItem(activeTab === 'case' ? 'case' : activeTab === 'resource' ? 'resource' : activeTab, item, index))}
                      </>
                    )}

                    {/* Empty State */}
                    {categorizedResults.total === 0 && !loading && (
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