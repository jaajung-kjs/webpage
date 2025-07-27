import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

const ActivitiesPage = dynamic(
  () => import('@/components/activities/ActivitiesPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default function Activities() {
  return (
    <MainLayout>
      <ActivitiesPage />
    </MainLayout>
  )
}