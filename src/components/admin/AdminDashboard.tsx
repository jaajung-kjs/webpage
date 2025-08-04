'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  AlertCircle
} from 'lucide-react'
import MembershipApplicationManager from './MembershipApplicationManager'
import MemberManagement from './MemberManagement'
import ReportManagement from './ReportManagement'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import PermissionGate from '@/components/shared/PermissionGate'

export default function AdminDashboard() {
  const { user } = useOptimizedAuth()
  const [activeTab, setActiveTab] = useState('applications')
  
  return (
    <PermissionGate requiredRole={['admin', 'leader', 'vice-leader']}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground mt-2">
            동아리 운영 및 회원 관리를 위한 관리자 전용 페이지입니다.
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full h-auto items-center justify-between rounded-md bg-muted p-0.5 text-muted-foreground">
            <TabsTrigger
              value="applications"
              className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center gap-1"
            >
              <Users className="h-3.5 w-3.5" />
              <span>가입 승인</span>
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center gap-1"
            >
              <Users className="h-3.5 w-3.5" />
              <span>전체 회원</span>
            </TabsTrigger>
            <TabsTrigger
              value="reports"
              className="flex-1 px-2.5 py-1 text-xs font-medium touch-manipulation min-h-[28px] flex items-center justify-center gap-1"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              <span>신고 관리</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="applications" className="space-y-6">
            <MembershipApplicationManager />
          </TabsContent>
          
          <TabsContent value="members">
            <MemberManagement />
          </TabsContent>
          
          <TabsContent value="reports">
            <ReportManagement />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGate>
  )
}