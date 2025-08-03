'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { Button } from '@/components/ui/button'
import { Download, FileText, File, Video, Music, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return ImageIcon
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) return Video
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext || '')) return Music
    if (ext === 'pdf') return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleFileDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  // Custom components for rendering
  const components: any = {
    // Enhanced image rendering with click to expand
    img: ({ src, alt }: any) => {
      if (!src) return null
      return (
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => window.open(src, '_blank')}
        />
      )
    },
    
    // Custom link rendering for file attachments
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
      if (!href) return <span>{children}</span>
      
      // Check if this is a file attachment link using our custom syntax
      const fileMatch = href.match(/^file:(.+):(.+)$/)
      if (fileMatch) {
        const [, fileName, fileUrl] = fileMatch
        const Icon = getFileIcon(fileName)
        
        return (
          <Card className="inline-flex items-center p-2 my-1 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-2 p-0">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{fileName}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2"
                onClick={(e) => {
                  e.preventDefault()
                  handleFileDownload(fileUrl, fileName)
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        )
      }
      
      // Regular link
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {children}
        </a>
      )
    },
    
    // Enhanced code blocks
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      
      if (!inline && match) {
        return (
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
            <div className="absolute top-2 right-2 text-xs text-muted-foreground">
              {match[1]}
            </div>
          </div>
        )
      }
      
      return (
        <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      )
    },
    
    // Tables with better styling
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {children}
        </table>
      </div>
    ),
    
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>
    ),
    
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {children}
      </th>
    ),
    
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
        {children}
      </td>
    ),
    
    // Blockquotes
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),
  }

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}