'use client'

import React, { useState, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link, 
  Image, 
  Paperclip,
  Eye,
  Edit,
  Upload,
  Loader2
} from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

// Dynamic import for the editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => <div className="animate-pulse h-96 bg-muted rounded-md" />
  }
)

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  onPaste?: (e: ClipboardEvent) => void
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 400,
  onPaste
}: MarkdownEditorProps) {
  const [view, setView] = useState<'write' | 'preview' | 'both'>('both')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<any>(null)

  // Get current cursor position
  const getCursorPosition = () => {
    // This is a simplified version - actual implementation would need to access the editor instance
    return value.length
  }

  // Insert text at cursor position
  const insertAtCursor = (text: string) => {
    const cursorPos = getCursorPosition()
    const newValue = value.slice(0, cursorPos) + text + value.slice(cursorPos)
    onChange(newValue)
  }

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setUploading(true)
    
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

        // Insert appropriate markdown based on file type
        if (file.type.startsWith('image/')) {
          // Insert image markdown
          insertAtCursor(`\n![${file.name}](${publicUrl})\n`)
        } else {
          // Insert file attachment with custom syntax
          insertAtCursor(`\n[📎 ${file.name}](file:${file.name}:${publicUrl})\n`)
        }
      }
      
      toast.success(`${files.length}개 파일이 업로드되었습니다.`)
    } catch (error: any) {
      console.error('Error uploading files:', error)
      toast.error('파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // Handle paste event
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }

    if (files.length > 0) {
      e.preventDefault()
      await handleFileUpload(files)
    }

    // Call parent's onPaste if provided
    if (onPaste) onPaste(e)
  }, [value, onChange])

  // Handle drag and drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await handleFileUpload(files)
    }
  }, [value, onChange])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Toolbar actions
  const toolbarActions = [
    {
      icon: Bold,
      title: '굵게',
      action: () => insertAtCursor('**텍스트**')
    },
    {
      icon: Italic,
      title: '기울임',
      action: () => insertAtCursor('*텍스트*')
    },
    {
      icon: List,
      title: '목록',
      action: () => insertAtCursor('\n- 항목\n')
    },
    {
      icon: ListOrdered,
      title: '번호 목록',
      action: () => insertAtCursor('\n1. 항목\n')
    },
    {
      icon: Quote,
      title: '인용',
      action: () => insertAtCursor('\n> 인용문\n')
    },
    {
      icon: Code,
      title: '코드',
      action: () => insertAtCursor('`코드`')
    },
    {
      icon: Link,
      title: '링크',
      action: () => insertAtCursor('[링크 텍스트](URL)')
    },
    {
      icon: Image,
      title: '이미지',
      action: () => insertAtCursor('![대체 텍스트](이미지 URL)')
    }
  ]

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Custom Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {toolbarActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                type="button"
                variant="ghost"
                size="sm"
                onClick={action.action}
                title={action.title}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
          
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* File upload button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Paperclip className="h-4 w-4" />
                <span className="text-xs">파일 첨부</span>
              </>
            )}
          </Button>
          
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
        </div>
        
        {/* View toggle */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={view === 'write' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('write')}
            className="h-8 px-2"
          >
            <Edit className="h-4 w-4 mr-1" />
            작성
          </Button>
          <Button
            type="button"
            variant={view === 'both' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('both')}
            className="h-8 px-2"
          >
            분할
          </Button>
          <Button
            type="button"
            variant={view === 'preview' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('preview')}
            className="h-8 px-2"
          >
            <Eye className="h-4 w-4 mr-1" />
            미리보기
          </Button>
        </div>
      </div>
      
      {/* Editor Content */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste as any}
        style={{ height }}
        className="relative"
      >
        {view === 'write' && (
          <MDEditor
            value={value}
            onChange={(val) => onChange(val || '')}
            preview="edit"
            hideToolbar
            height={height}
            data-color-mode="light"
            textareaProps={{
              placeholder
            }}
          />
        )}
        
        {view === 'preview' && (
          <div className="p-4 overflow-y-auto" style={{ height }}>
            <MarkdownRenderer content={value} />
          </div>
        )}
        
        {view === 'both' && (
          <div className="grid grid-cols-2 divide-x" style={{ height }}>
            <MDEditor
              value={value}
              onChange={(val) => onChange(val || '')}
              preview="edit"
              hideToolbar
              height={height}
              data-color-mode="light"
              textareaProps={{
                placeholder
              }}
            />
            <div className="p-4 overflow-y-auto">
              <MarkdownRenderer content={value} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}