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
import { useContent, useUpdateContent } from '@/hooks/useSupabase'
import { TablesUpdate } from '@/lib/supabase/client'
import ContentListLayout from '../shared/ContentListLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useIsMobile } from '@/hooks/useIsMobile'
import dynamic from 'next/dynamic'

// Dynamic import for the editor to avoid SSR issues
const TiptapEditor = dynamic(
  () => import('../shared/TiptapEditor'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-muted rounded-md" />
  }
)

interface CommunityEditPageProps {
  postId: string
}

const categories = [
  { value: 'tips', label: '꿀팁공유' },
  { value: 'review', label: '후기' },
  { value: 'help', label: '도움요청' },
  { value: 'discussion', label: '토론' },
  { value: 'question', label: '질문' },
  { value: 'chat', label: '잡담' }
]

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(100, '제목은 100자 이하여야 합니다'),
  category: z.string().min(1, '카테고리를 선택해주세요'),
  content: z.string().min(1, '내용을 입력해주세요').max(10000, '내용은 10000자 이하여야 합니다'),
  tags: z.array(z.string()).optional()
})

type FormValues = z.infer<typeof formSchema>

export default function CommunityEditPage({ postId }: CommunityEditPageProps) {
  const router = useRouter()
  const { user, profile } = useOptimizedAuth()
  const { data: postData, loading: loadingPost } = useContent(postId)
  const { updateContent, loading: updateLoading } = useUpdateContent()
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

  // Load post data into form when available
  useEffect(() => {
    if (postData) {
      form.setValue('title', postData.title || '')
      form.setValue('category', postData.category || '')
      form.setValue('content', postData.content || '')
      form.setValue('tags', postData.tags || [])
    }
  }, [postData, form])

  // Check if user is authorized to edit - only author can edit
  const canEdit = user && postData && user.id === postData.author_id

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
          localStorage.setItem(`draft-edit-${postId}`, JSON.stringify(draftData))
          console.log('Draft saved:', draftData)
        }, 1000)
      }
    })
    
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [form, postId])

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
    if (!user || !postData) {
      toast.error('권한이 없습니다.')
      return
    }

    if (!canEdit) {
      toast.error('이 게시글을 수정할 권한이 없습니다.')
      return
    }

    setIsSubmitting(true)

    try {
      const updates: TablesUpdate<'content'> = {
        title: values.title.trim(),
        content: values.content.trim(),
        category: values.category,
        tags: values.tags || [],
        updated_at: new Date().toISOString()
      }

      const result = await updateContent(postId, updates)
      
      if (result.error) {
        throw new Error(result.error.message)
      }

      // Clear draft on successful submission
      localStorage.removeItem(`draft-edit-${postId}`)
      setHasUnsavedChanges(false)
      
      toast.success('게시글이 수정되었습니다.')
      router.push(`/community/${postId}`)
    } catch (error: any) {
      console.error('Error updating content:', error)
      toast.error(error.message || '게시글 수정에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm('수정 중인 내용이 있습니다. 정말로 나가시겠습니까?')) {
        router.push(`/community/${postId}`)
      }
    } else {
      router.push(`/community/${postId}`)
    }
  }

  if (loadingPost) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!postData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            게시글을 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
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

  if (!canEdit) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            이 게시글을 수정할 권한이 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <ContentListLayout
      title="게시글 수정"
      description="게시글을 수정합니다."
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
          <Link href={`/community/${postId}`}>
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
                      placeholder="제목을 입력해주세요"
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
                    <TiptapEditor
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="내용을 입력해주세요"
                      height={400}
                    />
                  </FormControl>
                  <FormDescription>
                    이미지는 복사-붙여넣기, 드래그앤드롭, 또는 파일 선택으로 업로드할 수 있습니다.
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
                disabled={updateLoading || isSubmitting}
                className="kepco-gradient"
              >
                {(updateLoading || isSubmitting) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                수정 완료
              </Button>
            </div>
          </form>
        </Form>
      </>
    </ContentListLayout>
  )
}