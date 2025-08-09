'use client'
import MainLayout from '@/components/layout/MainLayout'
import CaseDetailPage from '@/components/cases/CaseDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

interface CaseDetailProps {
  params: Promise<{
    id: string
  }>
}

export default async function CaseDetail({ params }: CaseDetailProps) {
  const { id } = await params
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <CaseDetailPage caseId={id} />
      </PermissionGate>
    </MainLayout>
  )
}