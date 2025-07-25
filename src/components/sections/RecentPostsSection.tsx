'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, ThumbsUp, MessageCircle, Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { casesApi } from '@/lib/api'

interface CaseWithAuthor {
  id: string
  title: string
  content: string
  category: string
  subcategory: string | null
  views: number
  likes_count: number
  comments_count: number
  created_at: string
  profiles: {
    name: string
  } | null
}

const categoryLabels = {
  productivity: '생산성 향상',
  creativity: '창의적 활용',
  development: '개발',
  analysis: '분석',
  other: '기타',
  automation: '업무자동화',
  documentation: '문서작성',
  coding: '코딩',
  design: '디자인',
  research: '연구',
  communication: '커뮤니케이션'
}

const categoryColors = {
  productivity: 'bg-blue-100 text-blue-800',
  creativity: 'bg-purple-100 text-purple-800',
  development: 'bg-green-100 text-green-800',
  analysis: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
  automation: 'bg-blue-100 text-blue-800',
  documentation: 'bg-green-100 text-green-800',
  coding: 'bg-indigo-100 text-indigo-800',
  design: 'bg-pink-100 text-pink-800',
  research: 'bg-yellow-100 text-yellow-800',
  communication: 'bg-cyan-100 text-cyan-800'
}

export default function RecentPostsSection() {
  const [recentCases, setRecentCases] = useState<CaseWithAuthor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentCases()
  }, [])

  const fetchRecentCases = async () => {
    try {
      const { data, error } = await casesApi.getAll({
        sortBy: 'latest',
        limit: 3
      })

      if (error) throw error
      setRecentCases(data || [])
    } catch (error) {
      console.error('Error fetching recent cases:', error)
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="h-full">
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
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentCases.map((caseItem, index) => {
                const displayCategory = caseItem.subcategory || caseItem.category
                return (
                  <motion.div
                    key={caseItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                      <CardHeader>
                        <div className="mb-2 flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={categoryColors[displayCategory as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'}
                          >
                            {categoryLabels[displayCategory as keyof typeof categoryLabels] || displayCategory}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(caseItem.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <CardTitle className="line-clamp-2 text-xl leading-tight">
                          <Link href={`/cases/${caseItem.id}`} className="hover:text-primary">
                            {caseItem.title}
                          </Link>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4 line-clamp-3 text-base leading-relaxed">
                          {getDescription(caseItem.content)}
                        </CardDescription>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="font-medium">{caseItem.profiles?.name || '익명'}</span>
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
                )
              })}
            </div>
          )}

          {!loading && recentCases.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">아직 공유된 활용사례가 없습니다.</p>
              <Button size="lg" className="kepco-gradient" asChild>
                <Link href="/cases/new">
                  첫 번째 활용사례를 공유해보세요!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}

          {!loading && recentCases.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="mt-12 text-center"
            >
              <Button size="lg" className="kepco-gradient" asChild>
                <Link href="/cases/new">
                  나의 활용사례 공유하기
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