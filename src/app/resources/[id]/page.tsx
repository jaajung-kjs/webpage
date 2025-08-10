'use client'
import { use } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import ResourceDetailPage from '@/components/resources/ResourceDetailPage'
import PermissionGate from '@/components/shared/PermissionGate'

export default function ResourceDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <MainLayout>
      <PermissionGate requireMember={true}>
        <ResourceDetailPage resourceId={id} />
      </PermissionGate>
    </MainLayout>
  )
}