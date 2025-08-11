'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FileSpreadsheet, FileText, Database, Bot, ArrowRight, Clock, FileInput, FileOutput, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { RPAProgram } from './RPAListPage'

interface RPACardProps {
  program: RPAProgram
  isAdmin?: boolean
  onEdit?: (program: RPAProgram) => void
  onDelete?: (programId: string) => void
}

export default function RPACard({ program, isAdmin = false, onEdit, onDelete }: RPACardProps) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

  const handleCardClick = (e: React.MouseEvent) => {
    // 드롭다운 메뉴 클릭 시 카드 클릭 이벤트 방지
    if ((e.target as HTMLElement).closest('[role="menu"]') || 
        (e.target as HTMLElement).closest('button[aria-haspopup="menu"]')) {
      return
    }
    router.push(program.path)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(program)
    }
  }

  const handleDelete = async () => {
    if (onDelete) {
      onDelete(program.id)
      toast.success('RPA 프로그램이 삭제되었습니다.')
    }
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={handleCardClick}>
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              {getIcon()}
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="mr-2 h-4 w-4" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteDialog(true)
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
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

    {/* 삭제 확인 다이얼로그 */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>RPA 프로그램 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            "{program.title}" 프로그램을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}