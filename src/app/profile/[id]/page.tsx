import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

// Dynamic import for better performance
const ProfileDetailPage = dynamic(
  () => import('@/components/profile/ProfileDetailPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default async function ProfileDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  return (
    <MainLayout>
      <ProfileDetailPage userId={resolvedParams.id} />
    </MainLayout>
  )
}