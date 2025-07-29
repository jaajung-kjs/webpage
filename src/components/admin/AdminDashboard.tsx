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
import { useAuth } from '@/contexts/AuthContext'
import PermissionGate from '@/components/shared/PermissionGate'

export default function AdminDashboard() {
  const { user } = useAuth()
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              가입 승인
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              전체 회원
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              신고 관리
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