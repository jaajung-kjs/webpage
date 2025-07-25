'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar, 
  Eye, 
  MessageCircle,
  Heart,
  Share2,
  BookOpen,
  User,
  ArrowLeft,
  Send,
  ThumbsUp,
  Flag,
  MoreHorizontal,
  Edit,
  Trash2,
  Link as LinkIcon
} from 'lucide-react'

// Mock data for case detail
const mockCaseDetail = {
  id: '1',
  title: 'ChatGPT를 활용한 업무 보고서 자동화',
  content: `안녕하세요! 전력관리처에서 근무하는 김전력입니다.

오늘은 제가 최근에 도입한 ChatGPT를 활용한 업무 보고서 자동화 사례를 공유하고자 합니다.

## 배경

매월 작성해야 하는 업무 보고서가 있는데, 항상 비슷한 형식이지만 데이터를 정리하고 분석하는 데 많은 시간이 걸렸습니다. 특히 다음과 같은 어려움이 있었습니다:

- 데이터 수집 및 정리에 3-4시간 소요
- 보고서 작성 및 검토에 2-3시간 소요  
- 매월 반복되는 단순 업무로 인한 피로감

## 해결 방법

ChatGPT를 활용해서 다음과 같이 업무를 자동화했습니다:

### 1. 데이터 분석 프롬프트 작성
\`\`\`
다음 전력 사용량 데이터를 분석해서 전월 대비 증감률과 주요 특이사항을 정리해줘:
[데이터 입력]

분석 결과를 다음 형식으로 작성해줘:
1. 전월 대비 증감률
2. 주요 변동 요인
3. 향후 전망
\`\`\`

### 2. 보고서 템플릿 활용
보고서의 기본 구조를 ChatGPT에게 학습시키고, 매월 데이터만 업데이트하면 자동으로 보고서가 생성되도록 했습니다.

### 3. 검토 및 수정
생성된 보고서를 ChatGPT에게 다시 검토 요청해서 오류나 누락된 부분을 확인하고 개선했습니다.

## 결과

- **시간 단축**: 기존 6-7시간 → 2-3시간 (약 50% 단축)
- **품질 향상**: 일관된 형식과 분석 기준 적용
- **업무 만족도**: 반복 업무 줄어들어 창의적 업무에 집중 가능

## 활용 팁

1. **프롬프트 최적화**: 처음에는 결과가 만족스럽지 않을 수 있으니 프롬프트를 계속 개선하세요.
2. **템플릿 활용**: 자주 사용하는 보고서 형식은 템플릿으로 만들어두면 효율적입니다.
3. **검증 필수**: AI가 생성한 내용은 반드시 검토하고 사실 확인을 해야 합니다.

## 마무리

ChatGPT를 활용한 업무 자동화로 시간을 크게 절약할 수 있었습니다. 다른 분들도 본인의 업무에 맞게 활용해보시기 바랍니다.

질문이나 궁금한 점이 있으시면 언제든지 댓글로 남겨주세요!`,
  category: 'productivity',
  subcategory: 'automation',
  author: '김전력',
  authorAvatar: '/avatars/kim.jpg',
  authorRole: '동아리장',
  authorDepartment: '전력관리처',
  createdAt: '2024-02-05T10:30:00Z',
  updatedAt: '2024-02-05T10:30:00Z',
  views: 234,
  likes: 42,
  comments: 18,
  isLiked: true,
  isBookmarked: false,
  tags: ['ChatGPT', '업무자동화', '보고서', '생산성'],
  tools: ['ChatGPT'],
  difficulty: 'intermediate',
  timeRequired: '1-2시간',
  attachments: [
    {
      name: '보고서_템플릿.docx',
      size: '245KB',
      type: 'document'
    },
    {
      name: '프롬프트_예시.txt',
      size: '2KB',
      type: 'text'
    }
  ]
}

// Mock comments data
const mockComments = [
  {
    id: '1',
    author: '박송전',
    authorAvatar: '/avatars/park.jpg',
    authorRole: '부동아리장',
    content: '정말 유용한 정보 감사합니다! 저도 비슷한 업무가 있어서 한번 적용해보겠습니다. 프롬프트 예시 파일도 첨부해주셔서 더욱 도움이 됩니다.',
    createdAt: '2024-02-05T11:15:00Z',
    likes: 8,
    replies: [
      {
        id: '1-1',
        author: '김전력',
        authorAvatar: '/avatars/kim.jpg',
        authorRole: '동아리장',
        content: '도움이 되셨다니 기쁩니다! 적용하시면서 궁금한 점이 있으시면 언제든지 연락주세요.',
        createdAt: '2024-02-05T11:30:00Z',
        likes: 3
      }
    ]
  },
  {
    id: '2',
    author: '이배전',
    authorAvatar: '/avatars/lee.jpg',
    authorRole: '운영진',
    content: '50% 시간 단축이라니 정말 대단하네요! 혹시 데이터 보안은 어떻게 처리하셨나요? 민감한 정보가 포함된 보고서의 경우 주의할 점이 있을까요?',
    createdAt: '2024-02-05T14:20:00Z',
    likes: 12,
    replies: []
  },
  {
    id: '3',
    author: '정고객',
    authorAvatar: '/avatars/jung.jpg',
    authorRole: '운영진',
    content: '저는 아직 ChatGPT 초보인데, 이런 활용법이 있다니 놀랍습니다. 단계별로 따라해볼 수 있을 것 같아요. 다음 워크샵 때 이 내용으로 발표해주시면 어떨까요?',
    createdAt: '2024-02-05T16:45:00Z',
    likes: 6,
    replies: []
  }
]

interface CaseDetailPageProps {
  caseId: string
}

export default function CaseDetailPage({ caseId }: CaseDetailPageProps) {
  const [caseData] = useState(mockCaseDetail)
  const [comments] = useState(mockComments)
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(caseData.isLiked)
  const [likeCount, setLikeCount] = useState(caseData.likes)

  const handleLike = () => {
    if (isLiked) {
      setLikeCount(prev => prev - 1)
    } else {
      setLikeCount(prev => prev + 1)
    }
    setIsLiked(!isLiked)
  }

  const handleCommentSubmit = () => {
    if (newComment.trim()) {
      // Here you would typically send the comment to your backend
      console.log('New comment:', newComment)
      setNewComment('')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return '방금 전'
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInHours < 48) return '1일 전'
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/cases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              목록으로 돌아가기
            </Link>
          </Button>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              {/* Category and Tags */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  업무효율화
                </Badge>
                <Badge variant="outline">자동화</Badge>
                {caseData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <CardTitle className="text-2xl sm:text-3xl leading-tight">
                {caseData.title}
              </CardTitle>

              {/* Author and Meta Info */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={caseData.authorAvatar} alt={caseData.author} />
                    <AvatarFallback>
                      {caseData.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{caseData.author}</span>
                      <Badge variant="outline" className="text-xs">
                        {caseData.authorRole}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {caseData.authorDepartment} • {formatDate(caseData.createdAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{caseData.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{caseData.comments}</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Case Info */}
              <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">사용 도구</div>
                  <div className="mt-1">
                    {caseData.tools.map((tool) => (
                      <Badge key={tool} variant="secondary" className="mr-1">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">난이도</div>
                  <div className="mt-1 font-medium">중급</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">소요 시간</div>
                  <div className="mt-1 font-medium">{caseData.timeRequired}</div>
                </div>
              </div>

              {/* Content */}
              <div className="prose max-w-none">
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: caseData.content.replace(/\n/g, '<br/>') 
                  }}
                />
              </div>

              {/* Attachments */}
              {caseData.attachments && caseData.attachments.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-lg font-semibold">첨부 파일</h3>
                  <div className="space-y-2">
                    {caseData.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                            <BookOpen className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">{attachment.name}</div>
                            <div className="text-sm text-muted-foreground">{attachment.size}</div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          다운로드
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-between border-t pt-6">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={isLiked ? "default" : "outline"}
                    size="sm"
                    onClick={handleLike}
                    className={isLiked ? "bg-red-500 hover:bg-red-600" : ""}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                    좋아요 ({likeCount})
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" />
                    공유
                  </Button>
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    북마크
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Flag className="mr-2 h-4 w-4" />
                    신고
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>댓글 ({comments.length})</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {/* New Comment Form */}
              <div className="mb-6">
                <Textarea
                  placeholder="댓글을 작성해보세요..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-3"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button onClick={handleCommentSubmit} className="kepco-gradient">
                    <Send className="mr-2 h-4 w-4" />
                    댓글 작성
                  </Button>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Comments List */}
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id}>
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={comment.authorAvatar} alt={comment.author} />
                        <AvatarFallback>
                          {comment.author.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{comment.author}</span>
                          <Badge variant="outline" className="text-xs">
                            {comment.authorRole}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        
                        <p className="mt-2 text-sm leading-relaxed">
                          {comment.content}
                        </p>
                        
                        <div className="mt-3 flex items-center space-x-4">
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                            <ThumbsUp className="mr-1 h-3 w-3" />
                            좋아요 ({comment.likes})
                          </Button>
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                            답글
                          </Button>
                        </div>
                        
                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 ml-6 space-y-4 border-l-2 border-gray-100 pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex items-start space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={reply.authorAvatar} alt={reply.author} />
                                  <AvatarFallback className="text-xs">
                                    {reply.author.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-semibold">{reply.author}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {reply.authorRole}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatRelativeTime(reply.createdAt)}
                                    </span>
                                  </div>
                                  
                                  <p className="mt-1 text-sm leading-relaxed">
                                    {reply.content}
                                  </p>
                                  
                                  <div className="mt-2 flex items-center space-x-4">
                                    <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                                      <ThumbsUp className="mr-1 h-3 w-3" />
                                      좋아요 ({reply.likes})
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Related Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>관련 활용사례</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/cases/2" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      Claude를 활용한 문서 요약 자동화
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      긴 문서를 효율적으로 요약하는 방법
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">Claude</Badge>
                      <Badge variant="outline" className="text-xs">문서처리</Badge>
                    </div>
                  </div>
                </Link>
                
                <Link href="/cases/3" className="group">
                  <div className="rounded-lg border p-4 transition-colors group-hover:bg-gray-50">
                    <h4 className="font-semibold group-hover:text-primary">
                      GitHub Copilot으로 코딩 효율성 2배 향상
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      개발 업무의 생산성을 크게 높인 사례
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">GitHub Copilot</Badge>
                      <Badge variant="outline" className="text-xs">개발</Badge>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}