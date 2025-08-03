'use client'

import React, { useState } from 'react'
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
import { Loader2, X, Eye, Save } from 'lucide-react'
import { toast } from 'sonner'
import MarkdownEditor from './MarkdownEditor'
import MarkdownRenderer from './MarkdownRenderer'

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

  // Note: File upload is now handled by MarkdownEditor component
  // We only track attachments for the submission process here

  const handleSubmit = async (values: any) => {
    try {
      // Note: attachments are now embedded in the markdown content
      // We pass an empty array for backward compatibility
      await onSubmit(values, [])
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
                  <MarkdownEditor
                    value={(formField.value as string) || ''}
                    onChange={(value) => formField.onChange(value || '')}
                    placeholder={field.placeholder}
                    height={400}
                  />
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
                {/* Use MarkdownRenderer for preview if content has markdown field */}
                {fields.some(f => f.type === 'markdown') ? (
                  <div>
                    {fields.map(field => {
                      if (field.type === 'markdown') {
                        return (
                          <MarkdownRenderer
                            key={field.name}
                            content={(formValues[field.name] as string) || ''}
                          />
                        )
                      }
                      return null
                    })}
                  </div>
                ) : (
                  previewRenderer(formValues, attachments)
                )}
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                {fields.map(renderField)}

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
                    disabled={loading}
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