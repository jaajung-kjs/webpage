'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  MessageCircle,
  Mail,
  Users,
  BookOpen,
  Settings,
  Shield,
  Lightbulb
} from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'KEPCO AI 학습동아리는 무엇인가요?',
    answer: '한국전력공사 직원들을 위한 AI 학습 커뮤니티입니다. AI 기술을 업무에 활용하고, 관련 지식을 공유하며, 함께 성장하는 것을 목표로 합니다. 다양한 AI 도구 사용법부터 실무 적용 사례까지 폭넓은 주제를 다룹니다.',
    category: '일반',
    tags: ['동아리', '소개', 'AI', '한국전력']
  },
  {
    id: '2',
    question: '동아리에 가입하려면 어떻게 해야 하나요?',
    answer: '한국전력공사 직원이라면 누구나 가입할 수 있습니다. 회원가입 페이지에서 회사 이메일로 가입하신 후, 이메일 인증을 완료하시면 됩니다. 승인 과정은 보통 1-2일 정도 소요됩니다.',
    category: '가입',
    tags: ['가입', '회원', '승인', '이메일']
  },
  {
    id: '3',
    question: 'AI 초보자도 참여할 수 있나요?',
    answer: '물론입니다! 동아리는 AI 초보자부터 전문가까지 모든 수준의 회원을 환영합니다. 초보자를 위한 기초 강좌와 튜토리얼이 준비되어 있으며, 멘토링 시스템을 통해 선배 회원들의 도움을 받을 수 있습니다.',
    category: '참여',
    tags: ['초보자', '멘토링', '기초', '튜토리얼']
  },
  {
    id: '4',
    question: '어떤 AI 도구들을 다루나요?',
    answer: 'ChatGPT, Claude, Gemini 등 대화형 AI부터 DALL-E, Midjourney 같은 이미지 생성 AI, 그리고 업무 자동화 도구들까지 다양한 AI 도구를 다룹니다. 새로운 도구가 나올 때마다 스터디 그룹을 만들어 함께 학습합니다.',
    category: '학습',
    tags: ['ChatGPT', 'Claude', 'DALL-E', '도구', '스터디']
  },
  {
    id: '5',
    question: '오프라인 모임도 있나요?',
    answer: '네, 월 1-2회 정도 오프라인 모임을 진행합니다. 서울, 부산, 대구 등 주요 지역에서 지역별 모임을 개최하며, 워크샵, 세미나, 네트워킹 등 다양한 형태의 모임이 있습니다.',
    category: '모임',
    tags: ['오프라인', '모임', '워크샵', '세미나', '지역']
  },
  {
    id: '6',
    question: '게시글을 작성할 때 주의사항이 있나요?',
    answer: '회사 기밀 정보나 개인정보가 포함되지 않도록 주의해주세요. 또한 저작권을 침해하지 않는 내용으로 작성해주시고, 건전한 토론 문화를 위해 상호 존중하는 언어를 사용해주세요.',
    category: '이용수칙',
    tags: ['게시글', '기밀', '저작권', '예절']
  },
  {
    id: '7',
    question: '프로필 사진을 변경하려면 어떻게 하나요?',
    answer: '프로필 페이지에서 아바타 이미지를 클릭하시면 새로운 사진을 업로드할 수 있습니다. 5MB 이하의 JPG, PNG 파일만 업로드 가능하며, 적절한 프로필 사진 사용을 권장합니다.',
    category: '계정',
    tags: ['프로필', '아바타', '사진', '업로드']
  },
  {
    id: '8',
    question: '댓글이나 게시글을 수정/삭제할 수 있나요?',
    answer: '네, 본인이 작성한 댓글과 게시글은 언제든지 수정하거나 삭제할 수 있습니다. 게시글이나 댓글의 오른쪽 상단 메뉴 버튼을 클릭하시면 수정/삭제 옵션을 확인할 수 있습니다.',
    category: '기능',
    tags: ['댓글', '게시글', '수정', '삭제']
  },
  {
    id: '9',
    question: '북마크 기능은 어떻게 사용하나요?',
    answer: '관심 있는 게시글이나 자료에 북마크를 추가할 수 있습니다. 게시글 하단의 북마크 버튼을 클릭하면 저장되며, 프로필 페이지에서 저장된 북마크 목록을 확인할 수 있습니다.',
    category: '기능',
    tags: ['북마크', '저장', '프로필']
  },
  {
    id: '10',
    question: '로그인이 안 되는 경우 어떻게 해야 하나요?',
    answer: '이메일 인증이 완료되었는지 먼저 확인해주세요. 비밀번호를 잊으셨다면 로그인 페이지의 "비밀번호 찾기"를 이용하시거나, 계속 문제가 발생하면 관리자에게 문의해주세요.',
    category: '문제해결',
    tags: ['로그인', '비밀번호', '인증', '문의']
  },
  {
    id: '11',
    question: '활동 점수는 어떻게 계산되나요?',
    answer: '게시글 작성(10점), 댓글 작성(5점), 좋아요 받기(2점), 모임 참여(15점) 등의 활동에 따라 점수가 부여됩니다. 높은 활동 점수를 유지하면 우수 회원으로 선정되어 특별 혜택을 받을 수 있습니다.',
    category: '활동',
    tags: ['활동점수', '포인트', '우수회원', '혜택']
  },
  {
    id: '12',
    question: '자료 공유 시 주의사항이 있나요?',
    answer: '공유하는 자료가 저작권법을 위반하지 않는지 확인해주세요. 오픈소스나 본인이 직접 제작한 자료, 공개적으로 이용 가능한 자료만 공유해주시기 바랍니다.',
    category: '자료공유',
    tags: ['자료', '저작권', '오픈소스', '공유']
  }
]

const categories = ['전체', '일반', '가입', '참여', '학습', '모임', '이용수칙', '계정', '기능', '문제해결', '활동', '자료공유']

const categoryIcons = {
  '일반': HelpCircle,
  '가입': Users,
  '참여': MessageCircle,
  '학습': BookOpen,
  '모임': Users,
  '이용수칙': Shield,
  '계정': Settings,
  '기능': Settings,
  '문제해결': Lightbulb,
  '활동': MessageCircle,
  '자료공유': BookOpen
}

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [openItems, setOpenItems] = useState<string[]>([])

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === '전체' || faq.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category as keyof typeof categoryIcons] || HelpCircle
    return Icon
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          자주 묻는 질문
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          KEPCO AI 학습동아리에 대해 궁금한 점들을 확인해보세요
        </p>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 space-y-6"
      >
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="질문이나 키워드로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category)
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "kepco-gradient" : ""}
              >
                {category !== '전체' && <Icon className="mr-1 h-3 w-3" />}
                {category}
              </Button>
            )
          })}
        </div>
      </motion.div>

      {/* Results Count */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <p className="text-sm text-muted-foreground text-center">
          {filteredFAQs.length}개의 질문을 찾았습니다
        </p>
      </motion.div>

      {/* FAQ List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="max-w-4xl mx-auto space-y-4"
      >
        {filteredFAQs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                다른 검색어를 시도하거나 카테고리를 변경해보세요
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('전체')
                }}
              >
                전체 보기
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredFAQs.map((faq, index) => {
            const isOpen = openItems.includes(faq.id)
            const CategoryIcon = getCategoryIcon(faq.category)
            
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              >
                <Card className="transition-all hover:shadow-md">
                  <div className="w-full">
                    <CardHeader 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => toggleItem(faq.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              <CategoryIcon className="mr-1 h-3 w-3" />
                              {faq.category}
                            </Badge>
                            {faq.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <CardTitle className="text-lg">{faq.question}</CardTitle>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    {isOpen && (
                      <CardContent>
                        <div className="prose max-w-none">
                          <p className="text-muted-foreground leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                        {faq.tags.length > 2 && (
                          <div className="mt-4 flex flex-wrap gap-1">
                            {faq.tags.slice(2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* Contact Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-12 max-w-2xl mx-auto"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" />
              원하는 답변을 찾지 못하셨나요?
            </CardTitle>
            <CardDescription>
              다른 질문이 있으시면 언제든지 문의해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                관리자에게 문의
              </Button>
              <Button className="kepco-gradient flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                커뮤니티에서 질문하기
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              보통 24시간 이내에 답변을 받으실 수 있습니다
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}