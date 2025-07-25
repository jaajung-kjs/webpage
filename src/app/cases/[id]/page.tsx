import MainLayout from '@/components/layout/MainLayout'
import CaseDetailPage from '@/components/cases/CaseDetailPage'

interface CaseDetailProps {
  params: Promise<{
    id: string
  }>
}

export default async function CaseDetail({ params }: CaseDetailProps) {
  const { id } = await params
  return (
    <MainLayout>
      <CaseDetailPage caseId={id} />
    </MainLayout>
  )
}