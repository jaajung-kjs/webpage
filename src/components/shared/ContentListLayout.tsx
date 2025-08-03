'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/animations'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Search, Plus, Grid3X3, List, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentListLayoutProps {
  title: string
  description: string
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  
  // Create button
  showCreateButton?: boolean
  createButtonText?: string
  onCreateClick?: () => void
  
  // Categories
  categories?: { value: string; label: string }[]
  activeCategory?: string
  onCategoryChange?: (value: string) => void
  
  // Sort options
  sortOptions?: { value: string; label: string }[]
  activeSortBy?: string
  onSortChange?: (value: string) => void
  
  // View toggle (deprecated - now auto-responsive)
  showViewToggle?: boolean
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
  
  // Auto-responsive view mode (overrides manual viewMode)
  autoResponsiveViewMode?: boolean
  
  // Stats section
  statsSection?: ReactNode
  
  // Advanced filters (optional)
  advancedFilters?: ReactNode
  showAdvancedFilters?: boolean
  onAdvancedFiltersToggle?: () => void
  advancedFiltersCount?: number
  
  // Content - can be a function that receives the current view mode
  children: ReactNode | ((viewMode: 'grid' | 'list') => ReactNode)
  loading?: boolean
  emptyMessage?: string
  emptyAction?: ReactNode
  
  // Result count
  resultCount?: number
}

export default function ContentListLayout({
  title,
  description,
  searchPlaceholder = "검색...",
  searchValue,
  onSearchChange,
  showCreateButton = true,
  createButtonText = "새 글 작성",
  onCreateClick,
  categories,
  activeCategory,
  onCategoryChange,
  sortOptions,
  activeSortBy,
  onSortChange,
  showViewToggle = true,
  viewMode = 'grid',
  onViewModeChange,
  autoResponsiveViewMode = false,
  statsSection,
  advancedFilters,
  showAdvancedFilters,
  onAdvancedFiltersToggle,
  advancedFiltersCount = 0,
  children,
  loading = false,
  emptyMessage = "게시글이 없습니다.",
  emptyAction,
  resultCount,
}: ContentListLayoutProps) {
  // Auto-responsive view mode logic
  const [responsiveViewMode, setResponsiveViewMode] = useState<'grid' | 'list'>('grid')
  
  useEffect(() => {
    if (!autoResponsiveViewMode) return
    
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setResponsiveViewMode(e.matches ? 'list' : 'grid')
    }
    
    // Set initial value
    setResponsiveViewMode(mediaQuery.matches ? 'list' : 'grid')
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleMediaChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [autoResponsiveViewMode])
  
  // Use responsive mode if enabled, otherwise use provided viewMode
  const currentViewMode = autoResponsiveViewMode ? responsiveViewMode : viewMode
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {description}
            </p>
          </div>
          {showCreateButton && onCreateClick && (
            <Button className="kepco-gradient w-full sm:w-auto touch-manipulation" onClick={onCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{createButtonText}</span>
              <span className="sm:hidden">작성</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Section */}
      {statsSection && (
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          {statsSection}
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6 space-y-4"
      >
        {/* Search Bar Row */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Sort Dropdown */}
            {sortOptions && onSortChange && (
              <Select value={activeSortBy} onValueChange={onSortChange}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* View Toggle */}
            {showViewToggle && !autoResponsiveViewMode && onViewModeChange && (
              <div className="flex rounded-md border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange('grid')}
                  className={cn(
                    "rounded-r-none px-3 sm:px-2 touch-manipulation",
                    currentViewMode === 'grid' && "bg-muted"
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange('list')}
                  className={cn(
                    "rounded-l-none px-3 sm:px-2 touch-manipulation",
                    currentViewMode === 'list' && "bg-muted"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Advanced Filters Popover */}
            {advancedFilters && onAdvancedFiltersToggle && (
              <Popover open={showAdvancedFilters} onOpenChange={onAdvancedFiltersToggle}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("touch-manipulation", advancedFiltersCount > 0 && "border-primary")}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">필터</span>
                    {advancedFiltersCount > 0 && (
                      <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                        {advancedFiltersCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">고급 필터</h4>
                      <p className="text-sm text-muted-foreground">
                        원하는 조건으로 콘텐츠를 필터링하세요
                      </p>
                    </div>
                    <div className="border-t pt-4">
                      {advancedFilters}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Categories Tabs */}
        {categories && activeCategory && onCategoryChange && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs value={activeCategory} onValueChange={onCategoryChange}>
              <TabsList className="inline-flex h-10 sm:h-9 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category.value}
                    value={category.value}
                    className="whitespace-nowrap px-4 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-medium touch-manipulation"
                  >
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

      </motion.div>

      {/* Results Count */}
      {resultCount !== undefined && !loading && (
        <motion.div
          {...fadeInUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6"
        >
          <p className="text-sm text-muted-foreground">
            총 {resultCount}개의 게시글이 있습니다
          </p>
        </motion.div>
      )}

      {/* Content Area */}
      <motion.div
        {...fadeInUp}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-muted-foreground">로딩 중...</span>
            </div>
          </div>
        ) : resultCount === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {emptyAction}
          </div>
        ) : (
          typeof children === 'function' ? children(currentViewMode) : children
        )}
      </motion.div>
    </div>
  )
}