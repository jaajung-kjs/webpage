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
import { useAuth } from '@/providers'
import { useContentV2 } from '@/hooks/features/useContentV2'
import { TablesInsert, TablesUpdate, Tables } from '@/lib/database.types'
import ContentListLayout from './ContentListLayout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useIsMobile } from '@/hooks/useIsMobile'
import dynamic from 'next/dynamic'

// Dynamic import for the editor to avoid SSR issues
const TiptapEditor = dynamic(
  () => import('./TiptapEditor'),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-muted rounded-md" />
  }
)

interface ContentEditorPageProps {
  contentType: 'post' | 'case' | 'announcement' | 'resource'
  title: string
  description: string
  categories: { value: string; label: string }[]
  backLink: string
  editId?: string  // If provided, we're in edit mode
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
  backLink,
  editId
}: ContentEditorPageProps) {
  const router = useRouter()
  const { user, profile } = useAuth()
  
  // Use V2 hooks
  const contentV2 = useContentV2()
  
  // Use custom query for edit mode to disable auto-refetch
  const { data: existingContent, isPending: loadingContent } = contentV2.useContent(editId || '')
  
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const isMobile = useIsMobile()
  const isEditMode = !!editId

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      category: '',
      content: '',
      tags: []
    }
  })

  // Load existing content when in edit mode
  useEffect(() => {
    if (isEditMode && existingContent) {
      form.setValue('title', existingContent.title || '')
      form.setValue('category', (existingContent as any).category || '')
      form.setValue('content', existingContent.content || '')
      form.setValue('tags', (existingContent.tags || []).map((tag: any) => typeof tag === 'string' ? tag : tag.name))
      
      // 기존 첨부 파일 로드
      if ((existingContent as any).metadata?.attachments) {
        setAttachments((existingContent as any).metadata.attachments)
      }
    }
  }, [isEditMode, existingContent, form])

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
          const draftKey = isEditMode ? `draft-edit-${contentType}-${editId}` : `draft-${contentType}`
          localStorage.setItem(draftKey, JSON.stringify(draftData))
          console.log('Draft saved:', draftData)
        }, 1000)
      }
    })
    
    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [form, contentType, isEditMode, editId])

  // Load draft from localStorage
  useEffect(() => {
    const draftKey = isEditMode ? `draft-edit-${contentType}-${editId}` : `draft-${contentType}`
    const draft = localStorage.getItem(draftKey)
    if (draft && !isEditMode) {
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
        localStorage.removeItem(draftKey)
      }
    }
  }, [contentType, isEditMode, editId])

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

  // 파일 업로드 핸들러
  const handleFileUpload = (url: string, name: string, type: string, size: number) => {
    const newAttachment = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file_name: name,
      file_url: url,
      file_type: type,
      file_size: size,
      attachment_type: type.startsWith('image/') ? 'image' : 'file'
    }
    setAttachments(prev => [...prev, newAttachment])
  }

  const onSubmit = async (values: FormValues) => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      return
    }

    // Check permission for edit mode
    if (isEditMode && existingContent && user.id !== existingContent.author_id) {
      // Special permission for announcements: admin/leader/vice-leader can edit
      if (contentType === 'announcement' && ['admin', 'leader', 'vice-leader'].includes(profile?.role || '')) {
        // Allow edit
      } else {
        toast.error('이 게시글을 수정할 권한이 없습니다.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      let contentId: string
      
      if (isEditMode) {
        // Update existing content
        const updates: TablesUpdate<'content_v2'> = {
          title: values.title.trim(),
          category: values.category, // 카테고리도 업데이트
          content: values.content.trim(),
          metadata: {
            ...(existingContent as any)?.metadata,
            attachments: attachments.length > 0 ? attachments : undefined
          },
          updated_at: new Date().toISOString()
        }

        // updateContentAsync를 사용하여 mutation의 기본 onSuccess (캐시 무효화)가 실행되도록 함
        await contentV2.updateContentAsync({ id: editId!, updates })
        contentId = editId!
      } else {
        // Create new content
        // Map contentType to DB content_type
        const contentTypeMap = {
          post: 'community',
          case: 'case',
          announcement: 'announcement',
          resource: 'resource'
        } as const
        
        const newContent: TablesInsert<'content_v2'> = {
          content_type: contentTypeMap[contentType] || contentType,
          category: values.category, // 카테고리 필드 추가
          title: values.title.trim(),
          content: values.content.trim(),
          author_id: (user as any).id,
          metadata: attachments.length > 0 ? { attachments } : {},
          status: 'published' // Set status to published so it appears on the board
        }
        
        // 디버깅: 실제 전달되는 값 확인
        console.log('Creating content with:', {
          content_type: newContent.content_type,
          category: newContent.category,
          contentType_prop: contentType,
          category_value: values.category
        })

        // createContentAsync를 사용하여 mutation의 기본 onSuccess (캐시 무효화)가 실행되도록 함
        const result = await contentV2.createContentAsync(newContent)
        contentId = result.id
      }

      // Clear draft on successful submission
      const draftKey = isEditMode ? `draft-edit-${contentType}-${editId}` : `draft-${contentType}`
      localStorage.removeItem(draftKey)
      setHasUnsavedChanges(false)
      
      // Route mapping for correct URLs
      const routeMap = {
        post: 'community',
        case: 'cases',
        announcement: 'announcements',
        resource: 'resources'
      } as const
      
      toast.success(isEditMode ? '게시글이 수정되었습니다.' : '게시글이 작성되었습니다.')
      
      // 상세페이지로 이동
      router.push(`/${routeMap[contentType]}/${contentId}`)
    } catch (error: any) {
      console.error(isEditMode ? 'Error updating content:' : 'Error creating content:', error)
      toast.error(error.message || (isEditMode ? '게시글 수정에 실패했습니다.' : '게시글 작성에 실패했습니다.'))
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

  if (isEditMode && loadingContent) {
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

  if (isEditMode && !existingContent) {
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

  // Check edit permission early
  if (isEditMode && existingContent && user.id !== existingContent.author_id) {
    // Special permission for announcements: admin/leader/vice-leader can edit
    if (!(contentType === 'announcement' && ['admin', 'leader', 'vice-leader'].includes(profile?.role || ''))) {
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
                      <TiptapEditor
                        value={field.value}
                        onChange={field.onChange}
                        onFileUpload={handleFileUpload}
                        placeholder={placeholders.content}
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
                  disabled={isSubmitting}
                  className="kepco-gradient"
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? '수정 완료' : '게시하기'}
                </Button>
              </div>
            </form>
          </Form>
        </>
    </ContentListLayout>
  )
}