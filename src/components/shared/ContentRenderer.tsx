'use client'

import React from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import { cn } from '@/lib/utils'

interface ContentRendererProps {
  content: string
  className?: string
}

export default function ContentRenderer({ content, className }: ContentRendererProps) {
  // Check if content is HTML (from Tiptap) or Markdown
  const isHTML = content.trim().startsWith('<') && content.includes('</');
  
  if (isHTML) {
    // Render HTML content from Tiptap
    return (
      <div 
        className={cn(
          "content-renderer",
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto",
          "prose-a:text-primary prose-a:underline",
          "prose-pre:bg-muted prose-pre:rounded-md prose-pre:p-4",
          "prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5",
          "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4",
          // Handle empty paragraphs
          "[&_p:empty]:min-h-[1.5em] [&_p:empty]:my-3",
          "[&_p:empty:before]:content-['\\00a0']",
          // Preserve line breaks
          "[&_br]:block [&_br]:h-[0.5em]",
          // Ensure proper spacing between paragraphs
          "[&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
          className
        )}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }
  
  // Render Markdown content (for backward compatibility)
  return <MarkdownRenderer content={content} className={className} />
}