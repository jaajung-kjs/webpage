'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp } from 'lucide-react'

export default function QuickSearchBar() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [popularSearches, setPopularSearches] = useState<string[]>([])

  // 인기 검색어 가져오기
  useEffect(() => {
    const fetchPopularSearches = async () => {
      try {
        // Popular searches not implemented in modern API yet
        // For now, just use empty array
        setPopularSearches([])
      } catch (error) {
        console.error('Error fetching popular searches:', error)
      }
    }

    fetchPopularSearches()
  }, [])

  // 검색어 제안 가져오기
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
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
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  const handleSearch = (query: string = searchQuery) => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    handleSearch(suggestion)
  }

  const handlePopularSearchClick = (search: string) => {
    setSearchQuery(search)
    handleSearch(search)
  }

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="AI 도구, 활용사례, 학습자료를 검색해보세요..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch()
            }
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="pl-12 pr-20 py-3 text-base border-2 bg-white/90 backdrop-blur-sm"
        />
        <Button 
          onClick={() => handleSearch()}
          className="absolute right-2 top-1/2 -translate-y-1/2 kepco-gradient"
          size="sm"
        >
          검색
        </Button>
      </div>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 bg-white/95 backdrop-blur-sm border-2">
          <CardContent className="p-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center"
              >
                <Search className="h-3 w-3 mr-2 text-muted-foreground" />
                {suggestion}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Popular Searches */}
      {!searchQuery && popularSearches.length > 0 && (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">인기 검색어</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {popularSearches.map((search, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handlePopularSearchClick(search)}
              >
                <span className="mr-1 text-primary font-semibold">{index + 1}</span>
                {search}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}