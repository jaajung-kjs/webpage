import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

const CommunityPage = dynamic(
  () => import('@/components/community/CommunityPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default function Community() {
  return (
    <MainLayout>
      <CommunityPage />
    </MainLayout>
  )
}