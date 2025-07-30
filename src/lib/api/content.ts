/**
 * Content API Service
 * 
 * 통합 캐싱을 적용한 콘텐츠 API 서비스
 * 일관성 있는 캐싱 전략으로 성능 최적화
 */

import { supabase, handleSupabaseError, Tables, TablesInsert, Views } from '@/lib/supabase/client'
import { CacheManager, getCacheKey, CACHE_CONFIGS } from '@/lib/utils/cache-manager'
import { measurePerformance } from '@/lib/utils/performance-monitor'

// Types
type Content = Tables<'content'>
type ContentWithAuthor = Views<'content_with_author'>
type ContentInsert = TablesInsert<'content'>

// API Result wrapper
interface ApiResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ContentFilters {
  type?: 'post' | 'case' | 'announcement' | 'resource'
  category?: string
  status?: 'published' | 'draft' | 'archived'
  authorId?: string
  limit?: number
  offset?: number
  search?: string
}

export class ContentAPI {
  /**
   * 콘텐츠 목록 조회 (캐싱 적용)
   */
  static async getList(filters: ContentFilters = {}): Promise<ApiResult<ContentWithAuthor[]>> {
    const stopMeasure = measurePerformance('content.getList')
    
    try {
      // 캐시 키 생성
      const cacheKey = getCacheKey('content', 'list', JSON.stringify(filters))
      
      // 캐시된 데이터 또는 새로 가져오기
      const data = await CacheManager.get(
        cacheKey,
        async () => {
          let query = supabase
            .from('content_with_author')
            .select('*')
            .eq('status', filters.status || 'published')
          
          if (filters.type) query = query.eq('type', filters.type)
          if (filters.category) query = query.eq('category', filters.category)
          if (filters.authorId) query = query.eq('author_id', filters.authorId)
          if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
          }
          
          query = query
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)
          
          const { data, error } = await query
          
          if (error) throw error
          return data || []
        },
        { staleWhileRevalidate: true } // 오래된 데이터를 먼저 보여주고 백그라운드 갱신
      )
      
      stopMeasure()
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching content list:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch content' 
      }
    }
  }
  
  /**
   * 콘텐츠 상세 조회 (캐싱 적용)
   */
  static async getDetail(id: string): Promise<ApiResult<ContentWithAuthor>> {
    const stopMeasure = measurePerformance('content.getDetail')
    
    try {
      const cacheKey = getCacheKey('content', 'detail', id)
      
      const data = await CacheManager.get(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('content_with_author')
            .select('*')
            .eq('id', id)
            .single()
          
          if (error) throw error
          return data
        },
        { staleWhileRevalidate: true }
      )
      
      stopMeasure()
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching content detail:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch content' 
      }
    }
  }
  
  /**
   * 조회수 증가 (낙관적 업데이트)
   */
  static async incrementViewCount(id: string): Promise<ApiResult<void>> {
    const stopMeasure = measurePerformance('content.incrementView')
    
    try {
      // 낙관적으로 캐시 업데이트
      const cacheKey = getCacheKey('content', 'detail', id)
      let cached: ContentWithAuthor | null = null
      try {
        cached = await CacheManager.get<ContentWithAuthor>(
          cacheKey,
          async () => {
            const { data, error } = await supabase
              .from('content_with_author')
              .select('*')
              .eq('id', id)
              .single()
            if (error || !data) throw new Error('Content not found')
            return data
          }
        )
      } catch (e) {
        // Content not in cache or doesn't exist
      }
      
      if (cached) {
        // 낙관적 업데이트
        CacheManager.set(cacheKey, {
          ...cached,
          view_count: (cached.view_count || 0) + 1
        })
      }
      
      // DB 업데이트 (백그라운드)
      supabase.rpc('increment_view_count', { 
        content_id: id,
        content_type: cached?.type || 'post' 
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to increment view count:', error)
          // 실패 시 캐시 무효화
          CacheManager.invalidate(cacheKey)
        }
      })
      
      stopMeasure()
      return { success: true }
    } catch (error) {
      console.error('Error incrementing view count:', error)
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to increment view count' 
      }
    }
  }
  
  /**
   * 콘텐츠 생성
   */
  static async create(content: ContentInsert): Promise<ApiResult<Content>> {
    const stopMeasure = measurePerformance('content.create')
    
    try {
      const { data, error } = await supabase
        .from('content')
        .insert(content)
        .select()
        .single()
      
      if (error) throw error
      
      // 관련 캐시 무효화
      CacheManager.invalidate('content:list')
      CacheManager.invalidate('stats:')
      
      stopMeasure()
      return { success: true, data }
    } catch (error) {
      console.error('Error creating content:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: handleSupabaseError(error) 
      }
    }
  }
  
  /**
   * 콘텐츠 수정
   */
  static async update(id: string, updates: Partial<Content>): Promise<ApiResult<Content>> {
    const stopMeasure = measurePerformance('content.update')
    
    try {
      const { data, error } = await supabase
        .from('content')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      
      // 관련 캐시 무효화
      CacheManager.invalidate(`content:detail:${id}`)
      CacheManager.invalidate('content:list')
      
      stopMeasure()
      return { success: true, data }
    } catch (error) {
      console.error('Error updating content:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: handleSupabaseError(error) 
      }
    }
  }
  
  /**
   * 콘텐츠 삭제
   */
  static async delete(id: string): Promise<ApiResult<void>> {
    const stopMeasure = measurePerformance('content.delete')
    
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // 관련 캐시 무효화
      CacheManager.invalidate(`content:detail:${id}`)
      CacheManager.invalidate('content:list')
      CacheManager.invalidate('stats:')
      
      stopMeasure()
      return { success: true }
    } catch (error) {
      console.error('Error deleting content:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: handleSupabaseError(error) 
      }
    }
  }
  
  /**
   * 통계 조회 (캐싱 적용)
   */
  static async getStats(type?: 'post' | 'case' | 'announcement' | 'resource' | 'activity'): Promise<ApiResult<any>> {
    const stopMeasure = measurePerformance('content.getStats')
    
    try {
      const cacheKey = getCacheKey('stats', 'content', type || 'all')
      
      const data = await CacheManager.get(
        cacheKey,
        async () => {
          let query = supabase
            .from('content')
            .select('type, status, created_at', { count: 'exact' })
          
          if (type) query = query.eq('type', type)
          
          const { data, error, count } = await query
          
          if (error) throw error
          
          // 통계 계산
          const stats = {
            total: count || 0,
            byStatus: {} as Record<string, number>,
            byMonth: {} as Record<string, number>
          }
          
          data?.forEach(item => {
            // 상태별 집계
            stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1
            
            // 월별 집계
            const month = new Date(item.created_at).toISOString().slice(0, 7)
            stats.byMonth[month] = (stats.byMonth[month] || 0) + 1
          })
          
          return stats
        }
      )
      
      stopMeasure()
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching content stats:', error instanceof Error ? error.message : JSON.stringify(error))
      stopMeasure()
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch stats' 
      }
    }
  }
}

// 편의 함수들
export async function getContentList(filters?: ContentFilters) {
  return ContentAPI.getList(filters)
}

export async function getContentDetail(id: string) {
  return ContentAPI.getDetail(id)
}

export async function createContent(content: ContentInsert) {
  return ContentAPI.create(content)
}

export async function updateContent(id: string, updates: Partial<Content>) {
  return ContentAPI.update(id, updates)
}

export async function deleteContent(id: string) {
  return ContentAPI.delete(id)
}

export async function getContentStats(type?: 'post' | 'case' | 'announcement' | 'resource' | 'activity') {
  return ContentAPI.getStats(type)
}