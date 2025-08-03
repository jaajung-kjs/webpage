'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, X, Eye, Save, Upload, Image, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'

// Dynamic import for markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse h-64 bg-muted rounded-md" />
  }
)

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'markdown' | 'select' | 'tags'
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  validation?: z.ZodTypeAny
  rows?: number
  maxLength?: number
}

interface AttachmentInfo {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  attachment_type: 'image' | 'file'
}

interface ContentCreateModalEnhancedProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  fields: FieldConfig[]
  onSubmit: (data: any, attachments: AttachmentInfo[]) => Promise<void>
  loading?: boolean
  contentType: string
  previewRenderer?: (data: any, attachments: AttachmentInfo[]) => React.ReactNode
}

export default function ContentCreateModalEnhanced({
  isOpen,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  loading = false,
  contentType,
  previewRenderer,
}: ContentCreateModalEnhancedProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([])
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Build dynamic schema from fields
  const schemaObject: Record<string, z.ZodTypeAny> = {}
  fields.forEach((field) => {
    if (field.validation) {
      schemaObject[field.name] = field.validation
    }
  })
  const formSchema = z.object(schemaObject)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = field.type === 'tags' ? [] : ''
      return acc
    }, {} as Record<string, any>),
  })

  // Handle paste event for images
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          await handleFileUpload([file])
        }
      }
    }
  }, [])

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileUpload(files)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Upload files to Supabase Storage
  const handleFileUpload = async (files: File[]) => {
    setUploadingFiles(true)
    const newAttachments: AttachmentInfo[] = []

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `content/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath)

        const attachmentInfo: AttachmentInfo = {
          id: Math.random().toString(36).substring(7),
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          attachment_type: file.type.startsWith('image/') ? 'image' : 'file'
        }

        newAttachments.push(attachmentInfo)

        // If it's an image and we're in markdown content, insert it into the editor
        if (attachmentInfo.attachment_type === 'image') {
          const contentField = fields.find(f => f.type === 'markdown')
          if (contentField) {
            const currentContent = form.getValues(contentField.name) || ''
            const imageMarkdown = `\n![${file.name}](${publicUrl})\n`
            form.setValue(contentField.name, currentContent + imageMarkdown)
          }
        }
      }

      setAttachments([...attachments, ...newAttachments])
      toast.success(`${newAttachments.length}개 파일이 업로드되었습니다.`)
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error('파일 업로드에 실패했습니다.')
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      await onSubmit(values, attachments)
      form.reset()
      setAttachments([])
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const handleAddTag = (fieldName: string) => {
    if (tagInput.trim()) {
      const currentTags = (form.getValues(fieldName) as string[]) || []
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue(fieldName, [...currentTags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (fieldName: string, tagToRemove: string) => {
    const currentTags = (form.getValues(fieldName) as string[]) || []
    form.setValue(
      fieldName,
      currentTags.filter((tag: string) => tag !== tagToRemove)
    )
  }

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id))
  }

  const renderField = (field: FieldConfig) => {
    switch (field.type) {
      case 'text':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={field.placeholder}
                    maxLength={field.maxLength}
                    {...formField}
                    value={(formField.value as string) || ''}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                {field.maxLength && (
                  <p className="text-xs text-muted-foreground text-right">
                    {((formField.value as string) || '').length}/{field.maxLength}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'markdown':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <div 
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onPaste={handlePaste as any}
                    className="border rounded-md"
                  >
                    <MDEditor
                      value={(formField.value as string) || ''}
                      onChange={(value) => formField.onChange(value || '')}
                      preview="edit"
                      height={400}
                      data-color-mode="light"
                    />
                  </div>
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'select':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={(formField.value as string) || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      case 'tags':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder={field.placeholder}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddTag(field.name)
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddTag(field.name)}
                      >
                        추가
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {((formField.value as string[]) || []).map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-4 w-4 p-0"
                            onClick={() => handleRemoveTag(field.name, tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )

      default:
        return null
    }
  }

  const formValues = form.watch()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {showPreview && previewRenderer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">미리보기</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  편집으로 돌아가기
                </Button>
              </div>
              <div className="rounded-lg border p-4">
                {previewRenderer(formValues, attachments)}
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {fields.map(renderField)}

                {/* File Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">첨부파일</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                    >
                      {uploadingFiles ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      파일 선택
                    </Button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length > 0) {
                        handleFileUpload(files)
                      }
                    }}
                  />

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div className="flex items-center space-x-2">
                            {attachment.attachment_type === 'image' ? (
                              <Image className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm truncate max-w-xs">
                              {attachment.file_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({(attachment.file_size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    취소
                  </Button>
                  {previewRenderer && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      미리보기
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="kepco-gradient"
                    disabled={loading || uploadingFiles}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    작성하기
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}