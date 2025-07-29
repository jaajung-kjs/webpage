'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { HybridCache, createCacheKey } from '@/lib/utils/cache'

interface Stats {
  membersCount: number
  casesCount: number
  activitiesCount: number
  avgScore: number
}

const defaultStats = {
  membersCount: 0,
  casesCount: 0,
  activitiesCount: 0,
  avgScore: 0
}

export default function StatsSection() {
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Check cache first
      const cacheKey = createCacheKey('stats', 'home')
      const cachedStats = HybridCache.get<Stats>(cacheKey)
      
      if (cachedStats !== null) {
        setStats(cachedStats)
        setLoading(false)
        
        // Still fetch fresh data in background
        fetchFreshStats(true)
        return
      }
      
      await fetchFreshStats(false)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats({
        membersCount: 0,
        casesCount: 0,
        activitiesCount: 0,
        avgScore: 0
      })
      setLoading(false)
    }
  }

  const fetchFreshStats = async (isBackgroundUpdate: boolean) => {
    try {
      // Direct DB query for real statistics
      const { supabase } = await import('@/lib/supabase/client')
      
      const [usersResult, casesResult, activitiesResult, resourcesResult] = await Promise.allSettled([
        supabase.from('users').select('activity_score, role').in('role', ['member', 'vice-leader', 'leader', 'admin']),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('type', 'case'),
        supabase.from('activities').select('*', { count: 'exact', head: true }),
        supabase.from('content').select('*', { count: 'exact', head: true }).eq('type', 'resource')
      ])

      // Filter only members (member role and above)
      const members = usersResult.status === 'fulfilled' ? (usersResult.value.data || []) : []
      const membersCount = members.length
      const casesCount = casesResult.status === 'fulfilled' ? (casesResult.value.count || 0) : 0
      const activitiesCount = activitiesResult.status === 'fulfilled' ? (activitiesResult.value.count || 0) : 0
      const resourcesCount = resourcesResult.status === 'fulfilled' ? (resourcesResult.value.count || 0) : 0
      
      // Calculate real average activity score for members only
      const totalActivityScore = members.reduce((sum, user) => sum + (user.activity_score || 0), 0)
      const avgScore = membersCount > 0 ? Math.round(totalActivityScore / membersCount) : 0
      
      // Use actual learning sessions count, fallback to resources count if activities table doesn't exist
      const learningSessionsCount = activitiesCount > 0 ? activitiesCount : resourcesCount
      
      const freshStats = {
        membersCount: membersCount, // Show actual member count (member role and above)
        casesCount: casesCount,
        activitiesCount: learningSessionsCount, // Use actual learning sessions or resources
        avgScore: avgScore // Use real average for members only
      }
      
      // Cache the stats (30 minutes TTL)
      const cacheKey = createCacheKey('stats', 'home')
      HybridCache.set(cacheKey, freshStats, 1800000) // 30 minutes
      
      if (!isBackgroundUpdate) {
        setStats(freshStats)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching fresh stats:', error)
      if (!isBackgroundUpdate) {
        // Fallback data on any error
        setStats({
          membersCount: 0,
          casesCount: 0,
          activitiesCount: 0,
          avgScore: 0
        })
        setLoading(false)
      }
    }
  }

  const statsDisplay = [
    {
      value: loading ? '-' : `${stats.membersCount}+`,
      label: '동아리 멤버',
      description: '전력관리처 직원들이 함께 하고 있습니다'
    },
    {
      value: loading ? '-' : `${stats.casesCount}+`,
      label: 'AI 활용사례',
      description: '실무에 적용된 다양한 사례들을 공유했습니다'
    },
    {
      value: loading ? '-' : `${stats.activitiesCount}+`,
      label: '학습 세션',
      description: '정기적인 워크샵과 스터디를 진행했습니다'
    },
    {
      value: loading ? '-' : `${stats.avgScore}점`,
      label: '평균 활동점수',
      description: '멤버들의 평균 활동 점수입니다'
    }
  ]

  return (
    <section className="border-t bg-muted/30 py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-4 text-3xl font-bold sm:text-4xl"
          >
            함께 만들어가는 성과
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-12 text-lg text-muted-foreground"
          >
            AI 학습동아리가 함께 달성한 의미있는 결과들입니다
          </motion.p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {statsDisplay.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="mb-2 text-3xl font-bold kepco-text-gradient sm:text-4xl lg:text-5xl">
                {stat.value}
              </div>
              <div className="mb-2 text-lg font-semibold text-foreground">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}