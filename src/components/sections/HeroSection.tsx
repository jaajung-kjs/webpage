'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Users, BookOpen, Lightbulb } from 'lucide-react'
import { motion } from 'framer-motion'
import QuickSearchBar from '@/components/ui/quick-search-bar'
import { useAuth } from '@/providers'
import { useRouter } from 'next/navigation'

export default function HeroSection() {
  const { user, profile } = useAuth()
  const router = useRouter()
  
  const handleJoinClick = () => {
    if (user) {
      // 로그인된 경우 역할에 따라 라우팅
      if (profile?.role === 'guest') {
        router.push('/membership/apply')
      } else if (profile?.role === 'pending') {
        // 이미 신청한 경우
        router.push('/membership/status')
      } else {
        // 이미 회원인 경우
        router.push('/community')
      }
    } else {
      // 로그인되지 않은 경우 회원가입 모달 표시
      const event = new CustomEvent('openLoginDialog', { detail: { tab: 'signup' } })
      window.dispatchEvent(event)
    }
  }
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-32 translate-y-[-50%] rounded-full kepco-gradient opacity-10" />
        <div className="absolute left-0 bottom-0 h-48 w-48 translate-x-[-50%] translate-y-32 rounded-full bg-accent/20" />
      </div>
      
      <div className="container relative mx-auto px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="inline-flex items-center rounded-full border bg-card px-4 py-2 text-sm">
              <Zap className="mr-2 h-4 w-4 kepco-text-gradient" />
              <span className="font-medium">한국전력공사 강원본부 전력관리처</span>
            </div>
          </motion.div>

          {/* Main heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="kepco-text-gradient">AI 학습동아리</span>
            <br />
            <span className="text-foreground">함께 성장하는 미래</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-10 text-lg text-muted-foreground sm:text-xl lg:text-2xl"
          >
            생성형 AI를 활용하여 업무 생산성을 향상시키고,<br />
            구성원들과 함께 실무 경험과 노하우를 공유합니다
          </motion.p>

          {/* Quick Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-8 max-w-2xl mx-auto"
          >
            <QuickSearchBar />
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-16 flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button 
              size="lg" 
              className="kepco-gradient text-white"
              onClick={() => window.location.href = '/cases'}
            >
              활용사례 보기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={handleJoinClick}
            >
              {user 
                ? (profile?.role === 'guest' ? '동아리 가입 신청' : 
                   profile?.role === 'pending' ? '가입 신청 확인' : 
                   '커뮤니티 둘러보기')
                : '동아리 가입하기'}
            </Button>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-3"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg kepco-gradient">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 font-semibold">협업 학습</h3>
              <p className="text-sm text-muted-foreground">
                동료들과 함께 AI 활용법을 배우고 경험을 공유합니다
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg kepco-gradient">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 font-semibold">실무 적용</h3>
              <p className="text-sm text-muted-foreground">
                업무에 바로 적용할 수 있는 실용적인 AI 도구를 학습합니다
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg kepco-gradient">
                <Lightbulb className="h-6 w-6 text-white" />
              </div>
              <h3 className="mb-2 font-semibold">생산성 향상</h3>
              <p className="text-sm text-muted-foreground">
                AI를 활용하여 업무 효율성을 극대화합니다
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}