'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, MessageSquare, Calendar, BookOpen, Share, Award } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI 활용사례 공유',
    description: '실무에서 활용한 ChatGPT, Claude, Copilot 등의 구체적인 사용법과 효과를 공유합니다.',
    color: 'text-blue-500'
  },
  {
    icon: MessageSquare,
    title: '실시간 커뮤니티',
    description: 'AI 도구 사용 중 궁금한 점이나 문제를 동료들과 실시간으로 해결할 수 있습니다.',
    color: 'text-green-500'
  },
  {
    icon: Calendar,
    title: '정기 워크샵',
    description: '월 2회 정기 워크샵을 통해 최신 AI 트렌드와 실무 활용법을 함께 학습합니다.',
    color: 'text-purple-500'
  },
  {
    icon: BookOpen,
    title: '학습자료 라이브러리',
    description: '검증된 AI 도구 가이드, 프롬프트 템플릿, 활용 팁을 체계적으로 관리합니다.',
    color: 'text-orange-500'
  },
  {
    icon: Share,
    title: '프로젝트 협업',
    description: '부서별 AI 도입 프로젝트를 함께 진행하고 성과를 공유합니다.',
    color: 'text-red-500'
  },
  {
    icon: Award,
    title: '성과 인정',
    description: '우수한 AI 활용 사례는 포상하고, 전사적으로 확산할 수 있도록 지원합니다.',
    color: 'text-yellow-500'
  }
]

export default function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-4 text-3xl font-bold sm:text-4xl"
          >
            동아리 주요 활동
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-12 text-lg text-muted-foreground"
          >
            AI 학습동아리에서 제공하는 다양한 활동과 서비스를 만나보세요
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                  <CardHeader>
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg kepco-gradient`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}