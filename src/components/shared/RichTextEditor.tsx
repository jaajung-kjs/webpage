'use client'

import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react'
import RichTextEditorBase, { type Editor, type UseEditorOptions } from 'reactjs-tiptap-editor'
import { useIsMobile } from '@/hooks/useIsMobile'

// Import extensions individually using named exports
import { BaseKit } from 'reactjs-tiptap-editor'
import { Bold } from 'reactjs-tiptap-editor/bold'
import { Italic } from 'reactjs-tiptap-editor/italic'
import { Strike } from 'reactjs-tiptap-editor/strike'
import { Code } from 'reactjs-tiptap-editor/code'
import { Heading } from 'reactjs-tiptap-editor/heading'
import { BulletList } from 'reactjs-tiptap-editor/bulletlist'
import { OrderedList } from 'reactjs-tiptap-editor/orderedlist'
import { Blockquote } from 'reactjs-tiptap-editor/blockquote'
import { Link } from 'reactjs-tiptap-editor/link'
import { Image } from 'reactjs-tiptap-editor/image'
import { Video } from 'reactjs-tiptap-editor/video'
import { HorizontalRule } from 'reactjs-tiptap-editor/horizontalrule'
import { TextAlign } from 'reactjs-tiptap-editor/textalign'
import { Indent } from 'reactjs-tiptap-editor/indent'
import { SubAndSuperScript } from 'reactjs-tiptap-editor/subandsuperscript'
import { TaskList } from 'reactjs-tiptap-editor/tasklist'
import { TableOfContents } from 'reactjs-tiptap-editor/tableofcontent'
import { Highlight } from 'reactjs-tiptap-editor/highlight'
import { Color } from 'reactjs-tiptap-editor/color'
import { FontFamily } from 'reactjs-tiptap-editor/fontfamily'
import { FontSize } from 'reactjs-tiptap-editor/fontsize'
import { Attachment } from 'reactjs-tiptap-editor/attachment'
import { ImportWord } from 'reactjs-tiptap-editor/importword'
import { ExportPdf } from 'reactjs-tiptap-editor/exportpdf'
import { SlashCommand } from 'reactjs-tiptap-editor/slashcommand'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import TurndownService from 'turndown'
// @ts-ignore - no types available for turndown-plugin-gfm
import * as turndownPluginGfm from 'turndown-plugin-gfm'

// Import required CSS
import 'reactjs-tiptap-editor/style.css'
import 'katex/dist/katex.min.css'
import 'prism-code-editor-lightweight/layout.css'
import 'prism-code-editor-lightweight/themes/github-dark.css'
import 'react-image-crop/dist/ReactCrop.css'
import '@/styles/rich-text-editor.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export interface RichTextEditorRef {
  editor: Editor | null
}

// Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
})

// Add GFM support (tables, strikethrough, task lists)
const gfm = turndownPluginGfm.gfm
turndownService.use(gfm)

// Custom rule for file attachments
turndownService.addRule('file-attachment', {
  filter: function (node) {
    return node.nodeName === 'A' && (node as Element).getAttribute('data-file-attachment') === 'true'
  },
  replacement: function (content, node) {
    const element = node as Element
    const fileName = element.getAttribute('data-file-name') || content
    const fileUrl = element.getAttribute('href') || ''
    return `[📎 ${fileName}](file:${fileName}:${fileUrl})`
  }
})

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ value, onChange, placeholder, disabled = false }, ref) => {
    const editorRef = useRef<{ editor: Editor | null }>(null)
    const isMobile = useIsMobile()

    useImperativeHandle(ref, () => ({
      get editor() {
        return editorRef.current?.editor || null
      }
    }))

    // Upload file to Supabase
    const uploadFile = async (file: File): Promise<string> => {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `content/${fileName}`

        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(filePath, file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath)

        return publicUrl
      } catch (error: any) {
        console.error('Error uploading file:', error)
        toast.error('파일 업로드에 실패했습니다.')
        throw error
      }
    }

    // Configure extensions based on device
    const extensions = useMemo(() => {
      const baseExtensions: any[] = [
        BaseKit.configure({
          placeholder: {
            showOnlyCurrent: true,
            placeholder: placeholder || '내용을 입력하세요...'
          },
          characterCount: {
            limit: 50000
          }
        }),
        Heading,
        Bold,
        Italic,
        Strike,
        Code,
        BulletList,
        OrderedList,
        Blockquote,
        HorizontalRule,
        Link,
        Image.configure({
          upload: uploadFile,
          resourceImage: 'both'
        }),
        Video.configure({
          upload: uploadFile,
          resourceVideo: 'both'
        }),
        Attachment.configure({
          upload: uploadFile
        })
      ]

      // Add desktop-only extensions
      if (!isMobile) {
        baseExtensions.push(
          TaskList,
          TextAlign,
          Indent,
          SubAndSuperScript,
          Highlight,
          Color,
          FontFamily,
          FontSize,
          TableOfContents,
          ImportWord,
          ExportPdf,
          SlashCommand
        )
      }

      return baseExtensions
    }, [isMobile, placeholder])

    // Handle content change
    const handleContentChange = (content: string) => {
      // Convert HTML to Markdown before saving
      const markdown = turndownService.turndown(content)
      onChange(markdown)
    }

    // Editor options
    const editorOptions: UseEditorOptions = {
      onUpdate: ({ editor }) => {
        const html = editor.getHTML()
        handleContentChange(html)
      },
      editable: !disabled,
      autofocus: false
    }

    // Convert markdown to HTML for initial value
    const getInitialContent = () => {
      if (!value) return ''
      
      // Simple markdown to HTML conversion for initial display
      // This is a basic implementation - you might want to use a proper markdown parser
      let html = value
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
        .replace(/\[📎 ([^\]]+)\]\(file:[^:]+:([^)]+)\)/g, '<a href="$2" data-file-attachment="true" data-file-name="$1">📎 $1</a>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n/g, '<br />')
      
      return html
    }

    return (
      <div 
        className="rich-text-editor-wrapper border rounded-lg overflow-hidden touch-manipulation"
        style={{ 
          minHeight: '600px',
          WebkitUserSelect: 'text',
          userSelect: 'text'
        }}
      >
        <RichTextEditorBase
          ref={editorRef}
          content={getInitialContent()}
          output="html"
          extensions={extensions}
          useEditorOptions={editorOptions}
          dark={false}
          disabled={disabled}
          hideToolbar={false}
          disableBubble={isMobile}
          maxWidth="100%"
          minHeight="600px"
          maxHeight="none"
          contentClass="prose prose-slate max-w-none touch-manipulation"
        />
      </div>
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor