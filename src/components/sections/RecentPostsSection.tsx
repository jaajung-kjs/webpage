'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Lightbulb, Cpu, ChartBar, Zap, BookOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase, Views } from '@/lib/supabase/client'
import ContentCard from '@/components/shared/ContentCard'

interface PostWithAuthor {
  id: string
  title: string
  content: string
  category: string | null
  view_count: number
  like_count: number
  comment_count: number
  created_at: string | null
  author_id: string
  author_name: string | null
  author_avatar_url: string | null
  author_department: string | null
  tags: string[] | null
  metadata: Record<string, any> | null
}

const categoryLabels = {
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

const categoryIcons = {
  productivity: Zap,
  creativity: Lightbulb,
  development: Cpu,
  analysis: ChartBar,
  other: BookOpen
}

export default function RecentPostsSection() {
  const [recentPosts, setRecentPosts] = useState<PostWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentPosts()
  }, [])

  const fetchRecentPosts = async () => {
    try {
      // Fetch recent cases from DB with all necessary fields
      const { data, error } = await supabase
        .from('content_with_author')
        .select(`
          id,
          title,
          content,
          category,
          view_count,
          like_count,
          comment_count,
          created_at,
          author_id,
          author_name,
          author_avatar_url,
          author_department,
          tags,
          metadata
        `)
        .eq('type', 'case')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(3)
      
      if (error) {
        throw error
      }
      
      // Transform data to match expected type, filtering out items with null IDs or titles
      const transformedData = (data || [])
        .filter((item): item is Views<'content_with_author'> & { id: string; title: string; author_id: string } => 
          item.id !== null && item.title !== null && item.author_id !== null
        )
        .map((caseItem) => ({
          id: caseItem.id,
          title: caseItem.title,
          content: caseItem.content || '',
          category: caseItem.category,
          view_count: caseItem.view_count || 0,
          like_count: caseItem.like_count || 0,
          comment_count: caseItem.comment_count || 0,
          created_at: caseItem.created_at,
          author_id: caseItem.author_id,
          author_name: caseItem.author_name,
          author_avatar_url: caseItem.author_avatar_url,
          author_department: caseItem.author_department,
          tags: caseItem.tags || [],
          metadata: (caseItem.metadata || {}) as Record<string, any>
        }))
      
      setRecentPosts(transformedData)
    } catch (error) {
      console.error('Error fetching recent posts:', error)
      // 에러가 발생해도 빈 배열로 설정하여 UI가 깨지지 않도록 함
      setRecentPosts([])
    } finally {
      setLoading(false)
    }
  }

  const getDescription = (content: string) => {
    // Remove markdown and get first 100 characters
    const plainText = content.replace(/[#*`]/g, '').replace(/\n/g, ' ')
    return plainText.length > 100 ? plainText.substring(0, 100) + '...' : plainText
  }

  return (
    <section className="border-t bg-muted/30 py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 flex items-center justify-between">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="mb-4 text-3xl font-bold sm:text-4xl"
              >
                최근 활용사례
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-lg text-muted-foreground"
              >
                동료들이 공유한 최신 AI 활용 경험을 확인해보세요
              </motion.p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/cases">
                모든 사례 보기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-full bg-card rounded-lg border p-6 animate-pulse">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-20 bg-muted rounded" />
                    </div>
                    <div className="h-6 bg-muted rounded" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 w-3/4 bg-muted rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-muted rounded-full" />
                        <div className="h-4 w-16 bg-muted rounded" />
                      </div>
                      <div className="flex space-x-3">
                        <div className="h-4 w-8 bg-muted rounded" />
                        <div className="h-4 w-8 bg-muted rounded" />
                        <div className="h-4 w-8 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recentPosts.map((postItem, index) => {
                // Transform postItem to match Views<'content_with_author'> format
                const transformedPost = {
                  id: postItem.id,
                  title: postItem.title,
                  content: postItem.content,
                  excerpt: getDescription(postItem.content),
                  category: postItem.category,
                  view_count: postItem.view_count,
                  like_count: postItem.like_count,
                  comment_count: postItem.comment_count,
                  created_at: postItem.created_at,
                  author_id: postItem.author_id,
                  author_name: postItem.author_name,
                  author_avatar_url: postItem.author_avatar_url,
                  author_department: postItem.author_department,
                  author_email: null,
                  author_role: null,
                  metadata: postItem.metadata,
                  tags: postItem.tags,
                  type: 'case',
                  status: 'published',
                  updated_at: null,
                  is_pinned: false
                } as Views<'content_with_author'>

                return (
                  <motion.div
                    key={postItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <ContentCard
                      content={transformedPost}
                      viewMode="grid"
                      categoryLabels={categoryLabels}
                      categoryColors={categoryColors}
                      categoryIcons={categoryIcons}
                      linkPrefix="/cases"
                      index={index}
                    />
                  </motion.div>
                )
              })}
            </div>
          )}

          {!loading && recentPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">아직 공유된 게시글이 없습니다.</p>
              <Button size="lg" className="kepco-gradient" asChild>
                <Link href="/cases/new">
                  첫 번째 게시글을 작성해보세요!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {!loading && recentPosts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Button size="lg" className="kepco-gradient" asChild>
                <Link href="/cases/new">
                  나의 게시글 작성하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}