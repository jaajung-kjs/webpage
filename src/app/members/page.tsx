import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

// Dynamic import for better performance
const MembersPage = dynamic(
  () => import('@/components/members/MembersPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default function Members() {
  return (
    <MainLayout>
      <MembersPage />
    </MainLayout>
  )
}