'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  X,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { useCreateContent } from '@/hooks/useSupabase'
import { TablesInsert, supabase } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/textarea'
import ContentListLayout from './ContentListLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ContentEditorPageProps {
  contentType: 'post' | 'case' | 'announcement' | 'resource'
  title: string
  description: string
  categories: { value: string; label: string }[]
  backLink: string
}

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  content: z.string().min(1, '내용을 입력해주세요').max(10000, '내용은 10000자 이하여야 합니다'),
  tags: z.array(z.string()).optional()
})

type FormValues = z.infer<typeof formSchema>

export default function ContentEditorPage({
  contentType,
  title,
  description,
  categories,
  backLink
}: ContentEditorPageProps) {
  const router = useRouter()
  const { user, profile } = useOptimizedAuth()
  const { createContent, loading: createLoading } = useCreateContent()
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const isMobile = useIsMobile()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      category: '',
      content: '',
      tags: []
    }
  })

  // Auto-save draft to localStorage with debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const subscription = form.watch((value) => {
      if (value.title || value.content) {
        setHasUnsavedChanges(true)
        
        // Clear previous timeout
        clearTimeout(timeoutId)
        
        // Save after 1 second of no changes
        timeoutId = setTimeout(() => {
          const draftData = {
            ...value,
            savedAt: new Date().toISOString()
          }
          localStorage.setItem(`draft-${contentType}`, JSON.stringify(draftData))
          console.log('Draft saved:', draftData)
        }, 1000)
      }
    })
    
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [form, contentType])

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`draft-${contentType}`)
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft)
        console.log('Loading draft:', parsedDraft)
        // Use setValue for each field to trigger proper updates
        if (parsedDraft.title) form.setValue('title', parsedDraft.title)
        if (parsedDraft.category) form.setValue('category', parsedDraft.category)
        if (parsedDraft.content) form.setValue('content', parsedDraft.content)
        if (parsedDraft.tags) form.setValue('tags', parsedDraft.tags)
        
        if (parsedDraft.savedAt) {
          const savedDate = new Date(parsedDraft.savedAt)
          const timeAgo = Math.floor((Date.now() - savedDate.getTime()) / 1000 / 60)
          toast.info(`임시 저장된 내용을 불러왔습니다. (${timeAgo}분 전 저장)`)
        } else {
          toast.info('임시 저장된 내용을 불러왔습니다.')
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
        localStorage.removeItem(`draft-${contentType}`)
      }
    }
  }, [contentType])

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, isSubmitting])

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || []
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || []
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove))
  }

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    setIsSubmitting(true)

    try {
      const newContent: TablesInsert<'content'> = {
        type: contentType,
        title: values.title.trim(),
        content: values.content.trim(),
        category: values.category,
        tags: values.tags || [],
        author_id: user.id,
        status: 'published'
      }

      const result = await createContent(newContent)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      // Clear draft on successful submission
      localStorage.removeItem(`draft-${contentType}`)
      setHasUnsavedChanges(false)
      
      // Route mapping for correct URLs
      const routeMap = {
        post: 'community',
        case: 'cases',
        announcement: 'announcements',
        resource: 'resources'
      } as const
      
      toast.success('게시글이 작성되었습니다.')
      router.push(`/${routeMap[contentType]}/${result.data?.id}`)
    } catch (error: any) {
      console.error('Error creating content:', error)
      toast.error(error.message || '게시글 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('작성 중인 내용이 있습니다. 정말로 나가시겠습니까?')) {
        router.push(backLink)
      }
    } else {
      router.push(backLink)
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            로그인이 필요한 페이지입니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const getPlaceholders = () => {
    switch (contentType) {
      case 'post':
        return {
          title: '어떤 이야기를 나누고 싶으신가요?',
          content: '자유롭게 이야기를 작성해주세요. 이미지는 복사-붙여넣기로 바로 삽입할 수 있습니다.'
        }
      case 'case':
        return {
          title: 'AI 활용 사례의 제목을 입력해주세요',
          content: 'AI를 어떻게 활용하셨나요? 구체적인 사례와 결과를 공유해주세요.'
        }
      case 'announcement':
        return {
          title: '공지사항 제목을 입력해주세요',
          content: '동아리원들에게 전달할 공지사항을 작성해주세요.'
        }
      case 'resource':
        return {
          title: '자료의 제목을 입력해주세요',
          content: '자료에 대한 설명을 작성해주세요. 관련 링크나 파일을 첨부할 수 있습니다.'
        }
      default:
        return {
          title: '제목을 입력해주세요',
          content: '내용을 작성해주세요.'
        }
    }
  }

  const placeholders = getPlaceholders()

  return (
    <ContentListLayout
      title={title}
      description={description}
      searchPlaceholder=""
      searchValue=""
      onSearchChange={() => {}}
      showCreateButton={false}
      autoResponsiveViewMode={false}
      showSearchAndFilters={false}
      statsSection={null}
      showViewToggle={false}
      categories={[]}
      sortOptions={[]}
    >
      <>
        {/* Back button and status */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={backLink}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              돌아가기
            </Button>
          </Link>
          {hasUnsavedChanges && (
            <span className="text-sm text-muted-foreground">
              임시 저장됨
            </span>
          )}
        </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={placeholders.title}
                        className="text-lg"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="카테고리를 선택해주세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Content */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>내용</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={placeholders.content}
                        className="min-h-[200px] resize-y"
                        rows={10}
                      />
                    </FormControl>
                    <FormDescription>
                      Markdown 형식을 지원합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>태그 (선택사항)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="태그를 입력하고 Enter를 누르세요"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddTag()
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddTag}
                          >
                            추가
                          </Button>
                        </div>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {field.value.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="ml-1 h-4 w-4 p-0"
                                  onClick={() => handleRemoveTag(tag)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      관련 키워드를 추가하면 검색에 도움이 됩니다.
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Submit buttons */}
              <div className="flex justify-end gap-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading || isSubmitting}
                  className="kepco-gradient"
                >
                  {(createLoading || isSubmitting) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  게시하기
                </Button>
              </div>
            </form>
          </Form>
        </>
    </ContentListLayout>
  )
}