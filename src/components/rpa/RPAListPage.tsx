'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Bot } from 'lucide-react'
import RPACard from './RPACard'
import RPACreateDialog from './RPACreateDialog'
import { useAuth } from '@/providers'
import { useContentV2 } from '@/hooks/features/useContentV2'

// RPA 프로그램 타입 정의
export interface RPAProgram {
  id: string
  title: string
  description: string
  icon: 'excel' | 'pdf' | 'data' | 'bot'
  path: string
  inputTypes: string[]
  outputTypes: string[]
  isActive: boolean
  createdAt: string
}

export default function RPAListPage() {
  const { user, profile } = useAuth()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const { useInfiniteContents, createContentAsync } = useContentV2()

  const isAdmin = profile?.role === 'admin'

  // DB에서 RPA 프로그램 목록 가져오기
  const { data, isLoading, refetch } = useInfiniteContents(
    {
      type: 'rpa',
      status: 'published'
    },
    'created_at',
    'desc',
    20
  )

  // 모든 페이지의 데이터를 플랫하게 만들기
  const rpaContents = data?.pages?.flatMap(page => page.contents) || []

  // RPA 프로그램 데이터 변환
  const programs: RPAProgram[] = rpaContents.map(content => {
    const metadata = content.metadata as any
    return {
      id: content.id,
      title: content.title,
      description: content.content || '',
      icon: metadata?.icon || 'bot',
      path: metadata?.path || `/rpa/programs/${content.id}`,
      inputTypes: metadata?.inputTypes || [],
      outputTypes: metadata?.outputTypes || [],
      isActive: metadata?.isActive !== false,
      createdAt: content.created_at
    }
  })

  // 활성화된 프로그램만 표시
  const activePrograms = programs.filter(p => p.isActive)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">RPA 자동화 도구</h1>
            <p className="text-muted-foreground">
              업무 자동화를 위한 다양한 RPA 프로그램을 웹에서 바로 실행하세요
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="kepco-gradient"
            >
              <Plus className="mr-2 h-4 w-4" />
              RPA 추가
            </Button>
          )}
        </div>

      </div>

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 w-8 bg-muted rounded-lg mb-2" />
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full mt-2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* RPA 프로그램 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePrograms.map((program) => (
              <RPACard key={program.id} program={program} />
            ))}
          </div>

          {/* 프로그램이 없을 때 */}
          {activePrograms.length === 0 && (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">RPA 프로그램이 없습니다</h3>
              <p className="text-muted-foreground">
                {isAdmin ? '새로운 RPA 프로그램을 추가해주세요.' : '곧 새로운 프로그램이 추가될 예정입니다.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Admin용 RPA 추가 다이얼로그 */}
      {isAdmin && (
        <RPACreateDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onCreated={async (newProgram) => {
            // DB에 저장
            if (!user?.id) return
            
            await createContentAsync({
              author_id: user.id,
              content_type: 'rpa',
              title: newProgram.title,
              content: newProgram.description,
              status: 'published',
              category: null, // RPA doesn't use categories
              metadata: {
                icon: newProgram.icon,
                path: newProgram.path,
                inputTypes: newProgram.inputTypes,
                outputTypes: newProgram.outputTypes,
                isActive: true
              }
            } as any)

            refetch() // 목록 새로고침
            setCreateDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}