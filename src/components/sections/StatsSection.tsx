'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { casesApi } from '@/lib/api-unified'

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
      // Direct DB query for real statistics
      const { supabaseSimple } = await import('@/lib/supabase-simple')
      
      const [profilesResult, casesResult, activitiesResult, resourcesResult] = await Promise.all([
        supabaseSimple.from('profiles').select('activity_score'),
        supabaseSimple.from('cases').select('*', { count: 'exact', head: true }),
        supabaseSimple.from('activities').select('*', { count: 'exact', head: true }),
        supabaseSimple.from('resources').select('*', { count: 'exact', head: true })
      ])

      const profiles = profilesResult.data || []
      const profilesCount = profiles.length
      const casesCount = casesResult.count || 0
      const activitiesCount = activitiesResult.count || 0
      const resourcesCount = resourcesResult.count || 0
      
      // Calculate real average activity score
      const totalActivityScore = profiles.reduce((sum, profile) => sum + (profile.activity_score || 0), 0)
      const avgScore = profilesCount > 0 ? Math.round(totalActivityScore / profilesCount) : 0
      
      // Use actual learning sessions count, fallback to resources count if activities table doesn't exist
      const learningSessionsCount = activitiesCount > 0 ? activitiesCount : resourcesCount
      
      console.log('Real DB stats:', { 
        profilesCount, 
        casesCount, 
        activitiesCount, 
        resourcesCount, 
        learningSessionsCount,
        totalActivityScore,
        avgScore 
      })
      
      setStats({
        membersCount: profilesCount, // Show actual count
        casesCount: casesCount,
        activitiesCount: learningSessionsCount, // Use actual learning sessions or resources
        avgScore: avgScore // Use real average
      })
    } catch (error) {
      console.error('Error fetching real stats:', error)
      // Fallback data on any error
      setStats({
        membersCount: 0,
        casesCount: 0,
        activitiesCount: 0,
        avgScore: 0
      })
    } finally {
      setLoading(false)
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