'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import api from "@/lib/api.modern"
import { toast } from 'sonner'
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react'
import Link from 'next/link'

const formSchema = z.object({
  title: z.string().min(5, '제목은 최소 5자 이상이어야 합니다').max(100, '제목은 100자 이하여야 합니다'),
  description: z.string().min(20, '내용 요약은 최소 20자 이상이어야 합니다').max(200, '내용 요약은 200자 이하여야 합니다'),
  content: z.string().min(50, '본문은 최소 50자 이상이어야 합니다'),
  category: z.enum(['productivity', 'creativity', 'development', 'analysis', 'other'], {
    message: '카테고리를 선택해주세요',
  }),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  tags: z.string().min(1, '최소 1개의 태그를 입력해주세요'),
})

const categoryLabels = {
  productivity: '생산성',
  creativity: '창의성',
  development: '개발',
  analysis: '분석',
  other: '기타'
}

export default function NewCasePage() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      content: '',
      category: undefined,
      tags: '',
    },
  })

  // Redirect if not authenticated
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>로그인이 필요합니다</CardTitle>
            <CardDescription>
              활용사례를 공유하려면 먼저 로그인해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full kepco-gradient" asChild>
              <Link href="/">홈으로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      const caseData = {
        title: values.title,
        content: values.content,
        type: 'case' as const,
        category: values.category,
        tags: values.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        author_id: user.id,
        status: 'published' as const,
        excerpt: values.description,
        metadata: {
          subcategory: 'automation',
          tools: ['AI Assistant'],
          difficulty: 'beginner',
          time_required: '1-2시간',
          is_featured: false
        }
      }

      // Validate case data
      const validation = api.utils.validateContent(caseData)
      if (!validation.valid) {
        toast.error('입력 오류', {
          description: validation.errors.join(', ')
        })
        return
      }

      const response = await api.content.createContent(caseData)
      
      if (response.success) {
        toast.success('사례 등록 성공', {
          description: '새로운 사례가 성공적으로 등록되었습니다.'
        })
        router.push('/cases')
      } else {
        throw new Error(response.error)
      }
    } catch (error) {
      console.error('Error submitting case:', error)
      toast.error('사례 등록 실패', {
        description: error instanceof Error ? error.message : '사례 등록 중 오류가 발생했습니다.'
      })
    } finally {
      setLoading(false)
    }
  }

  const formValues = form.watch()
  const parsedTags = formValues.tags ? formValues.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-4">
            <Button variant="ghost" asChild>
              <Link href="/cases">
                <ArrowLeft className="mr-2 h-4 w-4" />
                활용사례 목록으로
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            새로운 활용사례 공유
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            동료들과 AI 활용 경험을 공유해주세요
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle>활용사례 작성</CardTitle>
                <CardDescription>
                  구체적이고 실용적인 정보를 포함해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>제목 *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="예: ChatGPT를 활용한 회의록 자동 작성"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            어떤 AI 도구를 어떻게 활용했는지 명확하게 작성해주세요
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>카테고리 *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="카테고리를 선택해주세요" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(categoryLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>내용 요약 *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="활용사례의 핵심 내용을 간단히 요약해주세요"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            목록 페이지에서 보여질 요약 설명입니다 (20-200자)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>본문 *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="구체적인 활용 방법, 프롬프트 예시, 효과 등을 자세히 작성해주세요"
                              className="min-h-[300px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            다른 동료들이 따라할 수 있도록 구체적으로 작성해주세요
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>태그 *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="ChatGPT, 문서작성, 업무자동화 (쉼표로 구분)"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            관련 키워드를 쉼표(,)로 구분하여 입력해주세요
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPreview(!preview)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {preview ? '편집으로 돌아가기' : '미리보기'}
                      </Button>
                      <Button
                        type="submit"
                        className="kepco-gradient"
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        공유하기
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-20">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">미리보기</CardTitle>
                  <CardDescription>
                    작성중인 내용이 어떻게 보일지 확인하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formValues.title && (
                    <div>
                      <h3 className="font-semibold line-clamp-2">{formValues.title}</h3>
                    </div>
                  )}
                  
                  {formValues.category && (
                    <div>
                      <Badge variant="secondary">
                        {categoryLabels[formValues.category as keyof typeof categoryLabels]}
                      </Badge>
                    </div>
                  )}
                  
                  {formValues.description && (
                    <div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {formValues.description}
                      </p>
                    </div>
                  )}
                  
                  {parsedTags.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {parsedTags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {parsedTags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{parsedTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {user && (
                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span className="font-medium">{user.profile?.name}</span>
                        <span>·</span>
                        <span>{user.profile?.department}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}