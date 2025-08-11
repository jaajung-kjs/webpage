'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ContentCard from '@/components/shared/ContentCard'
import ContentListLayout from '@/components/shared/ContentListLayout'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabaseClient } from '@/lib/core/connection-core'

const contentTypeLabels = {
  all: '전체',
  community: '커뮤니티',
  case: '활용사례',
  resource: '학습자료',
  announcement: '공지사항'
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'community' | 'case' | 'resource' | 'announcement'>('all')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // URL 업데이트
  const updateURL = useCallback((query: string) => {
    if (query) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
    } else {
      router.push('/search')
    }
  }, [router])

  // 검색 실행 함수 - activeTab이 변경되어도 전체 검색 수행
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    try {
      // 항상 전체 검색 수행 (탭 필터는 클라이언트 사이드에서 처리)
      const { data, error } = await supabaseClient
        .rpc('search_content_v2', {
          p_query: query.trim(),
          p_content_type: undefined, // 항상 전체 검색
          p_limit: 50,
          p_offset: 0
        })

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Search error:', error)
      toast.error('검색 중 오류가 발생했습니다')
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 검색 결과를 카테고리별로 분류
  const categorizedResults = useMemo(() => {
    const results = { 
      all: [],
      community: [], 
      case: [], 
      resource: [], 
      announcement: [] 
    } as any
    
    if (searchResults && Array.isArray(searchResults)) {
      searchResults.forEach((item: any) => {
        // ContentCard가 기대하는 정확한 데이터 형식으로 변환
        const formattedItem = {
          id: item.id,
          title: item.title,
          content: item.content,
          content_type: item.content_type,
          category: item.category,
          created_at: item.created_at,
          updated_at: item.updated_at,
          interaction_counts: {
            views: item.view_count || 0,
            likes: item.like_count || 0
          },
          comment_count: item.comment_count || 0,
          author: {
            id: item.author_id,
            name: item.author_name,
            avatar_url: item.author_avatar,
            department: item.author_department
          },
          excerpt: item.summary || item.content || '',
          tags: item.tags || [],
          metadata: {
            is_pinned: false,
            has_image: item.has_image || false,
            attachments: item.attachments || []
          }
        }

        results.all.push(formattedItem)
        
        switch (item.content_type) {
          case 'community':
            results.community.push(formattedItem)
            break
          case 'case':
            results.case.push(formattedItem)
            break
          case 'resource':
            results.resource.push(formattedItem)
            break
          case 'announcement':
            results.announcement.push(formattedItem)
            break
        }
      })
    }
    
    return results
  }, [searchResults])

  // 현재 탭에 표시할 결과
  const displayResults = useMemo(() => {
    return categorizedResults[activeTab] || []
  }, [categorizedResults, activeTab])

  // 초기 로드 - URL 파라미터에서 검색어 가져오기
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [searchParams, performSearch])

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      toast.error('검색어를 입력해주세요')
      return
    }
    setSearchQuery(query)
    updateURL(query)
    performSearch(query)
  }

  // 탭 변경 시 - 검색 다시 수행하지 않음
  const handleTabChange = (value: string) => {
    setActiveTab(value as any)
    // performSearch를 호출하지 않음 - 이미 가진 결과를 필터링만 함
  }

  // 콘텐츠 타입별 링크 프리픽스
  const getLinkPrefix = (contentType: string) => {
    switch (contentType) {
      case 'community':
        return '/community'
      case 'case':
        return '/cases'
      case 'resource':
        return '/resources'
      case 'announcement':
        return '/announcements'
      default:
        return '/'
    }
  }

  // Categories for tabs
  const categories = Object.entries(contentTypeLabels).map(([value, label]) => ({ 
    value, 
    label: `${label} (${categorizedResults[value as keyof typeof categorizedResults]?.length || 0})` 
  }))

  return (
    <ContentListLayout
      title={
        <span className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          통합 검색
        </span>
      }
      description="커뮤니티, 활용사례, 학습자료, 공지사항을 한번에 검색하세요"
      searchPlaceholder="검색어를 입력하세요..."
      searchValue={searchQuery}
      onSearchChange={(value) => {
        setSearchQuery(value)
        if (value.trim()) {
          updateURL(value)
          performSearch(value)
        }
      }}
      showCreateButton={false}
      categories={searchQuery ? categories : undefined}
      activeCategory={searchQuery ? activeTab : undefined}
      onCategoryChange={searchQuery ? handleTabChange : undefined}
      autoResponsiveViewMode={true}
      showViewToggle={false}
      showSearchAndFilters={true}
      loading={loading}
      resultCount={searchQuery ? displayResults.length : undefined}
      emptyMessage={
        !searchQuery 
          ? '검색어를 입력해주세요'
          : activeTab === 'all' 
            ? '검색 결과가 없습니다' 
            : `${contentTypeLabels[activeTab]}에서 검색 결과가 없습니다`
      }
      emptyAction={
        searchQuery && activeTab !== 'all' && categorizedResults.all.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            전체 탭에서 다시 확인해보세요
          </p>
        ) : null
      }
    >
      {(currentViewMode) => (
        searchQuery ? (
          <div className={currentViewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
          }>
            {displayResults.map((item: any, index: number) => (
              <ContentCard
                key={item.id}
                content={item}
                viewMode={currentViewMode}
                linkPrefix={getLinkPrefix(item.content_type)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              검색어를 입력하여 콘텐츠를 찾아보세요
            </p>
          </div>
        )
      )}
    </ContentListLayout>
  )
}