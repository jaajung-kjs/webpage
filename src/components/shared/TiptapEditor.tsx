'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import CodeBlock from '@tiptap/extension-code-block'
import '@/styles/tiptap-editor.css'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Paperclip,
  Loader2,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react'
import { toast } from 'sonner'
import { supabaseClient } from '@/lib/core/connection-core'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  className?: string
}

export default function TiptapEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 400,
  className
}: TiptapEditorProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Initialize editor
  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-muted rounded-md p-4 font-mono text-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'min-h-[200px] px-4 py-3',
          className
        ),
        'data-placeholder': placeholder,
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              handleImageUpload([file])
              return true
            }
          }
        }
        return false
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files.length > 0) {
          event.preventDefault()
          const files = Array.from(event.dataTransfer.files)
          const imageFiles = files.filter(file => file.type.startsWith('image/'))
          if (imageFiles.length > 0) {
            handleImageUpload(imageFiles)
            return true
          }
        }
        return false
      },
    },
  })

  // Update editor content when value prop changes
  // Only update if editor is not focused to prevent overwriting user input
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !editor.isFocused) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  // Handle file upload
  const handleImageUpload = async (files: File[]) => {
    if (!editor) return
    
    setUploading(true)
    
    try {
      for (const file of files) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB.`)
          continue
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `content/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
          .from('attachments')
          .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('attachments')
          .getPublicUrl(filePath)

        // Insert image at current position
        editor.chain().focus().setImage({ src: publicUrl }).run()
      }
      
      toast.success(`${files.length}개 이미지가 업로드되었습니다.`)
    } catch (error: any) {
      console.error('Error uploading images:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (!editor) return
    
    setUploading(true)
    
    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `content/${fileName}`

        // Upload to Supabase Storage
        const { data, error } = await supabaseClient.storage
          .from('attachments')
          .upload(filePath, file)

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage
          .from('attachments')
          .getPublicUrl(filePath)

        // Insert as link for non-image files
        if (file.type.startsWith('image/')) {
          editor.chain().focus().setImage({ src: publicUrl }).run()
        } else {
          editor
            .chain()
            .focus()
            .insertContent(`<a href="${publicUrl}" target="_blank">📎 ${file.name}</a>`)
            .run()
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

  // Add link
  const setLink = useCallback(() => {
    if (!editor) return

    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return <div className="animate-pulse h-96 bg-muted rounded-md" />
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    children,
    title
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title?: string
  }) => {
    const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClick()
    }
    
    return (
      <button
        type="button"
        disabled={disabled}
        title={title}
        onMouseDown={handleClick}
        onTouchStart={handleClick}
        className={cn(
          "h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          isActive 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "hover:bg-accent hover:text-accent-foreground",
          "active:bg-accent/80"
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Desktop Toolbar */}
      {!isMobile && (
        <div className="tiptap-toolbar border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap">
          {/* Text formatting */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="굵게 (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="기울임 (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="인라인 코드"
            >
              <Code className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {!isMobile && <div className="w-px h-6 bg-border" />}

          {/* Headings */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="제목 1"
            >
              <Heading1 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="제목 2"
            >
              <Heading2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="제목 3"
            >
              <Heading3 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {!isMobile && <div className="w-px h-6 bg-border" />}

          {/* Lists */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="글머리 기호"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="번호 목록"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="인용문"
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {!isMobile && <div className="w-px h-6 bg-border" />}

          {/* Links and images */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              title="링크"
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="이미지"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
            </ToolbarButton>
          </div>

          {!isMobile && <div className="w-px h-6 bg-border" />}

          {/* History */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="실행 취소 (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="다시 실행 (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>

          {!isMobile && <div className="w-px h-6 bg-border" />}

          {/* File upload */}
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
        </div>
      )}

      {/* Editor Content */}
      <div 
        style={{ height }} 
        className="overflow-y-auto relative"
        data-tiptap-editor
      >
        <EditorContent editor={editor} />
      </div>

      {/* Mobile Bottom Toolbar */}
      {isMobile && (
        <div className="tiptap-toolbar border-t bg-muted/50 p-2 flex items-center justify-around">
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz,.txt,.md,.json,.xml,.csv,.mp4,.mp3,.wav,.avi,.mov,.mkv"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length > 0) {
            handleFileUpload(files)
          }
        }}
      />
    </div>
  )
}