'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, FileText, Database, Bot, ArrowRight, Clock, FileInput, FileOutput } from 'lucide-react'
import type { RPAProgram } from './RPAListPage'

interface RPACardProps {
  program: RPAProgram
}

export default function RPACard({ program }: RPACardProps) {
  const router = useRouter()

  // 아이콘 매핑
  const getIcon = () => {
    switch (program.icon) {
      case 'excel':
        return <FileSpreadsheet className="h-8 w-8" />
      case 'pdf':
        return <FileText className="h-8 w-8" />
      case 'data':
        return <Database className="h-8 w-8" />
      default:
        return <Bot className="h-8 w-8" />
    }
  }

  const handleClick = () => {
    router.push(program.path)
  }

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleClick}>
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {getIcon()}
          </div>
        </div>
        <CardTitle className="text-xl">{program.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {program.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* 입력 정보 */}
        <div className="flex items-start gap-2 text-sm">
          <FileInput className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-muted-foreground">입력: </span>
            <span>{program.inputTypes.join(', ')}</span>
          </div>
        </div>
        
        {/* 출력 정보 */}
        <div className="flex items-start gap-2 text-sm">
          <FileOutput className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <span className="text-muted-foreground">출력: </span>
            <span>{program.outputTypes.join(', ')}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{new Date(program.createdAt).toLocaleDateString('ko-KR')}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          className="group-hover:translate-x-1 transition-transform"
        >
          실행하기
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}