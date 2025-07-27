import dynamic from 'next/dynamic'
import MainLayout from '@/components/layout/MainLayout'
import { PageLoadingFallback } from '@/components/ui/lazy-loader'

const AnnouncementsPage = dynamic(
  () => import('@/components/announcements/AnnouncementsPage'),
  {
    loading: () => <PageLoadingFallback />,
    ssr: true
  }
)

export default function Announcements() {
  return (
    <MainLayout>
      <AnnouncementsPage />
    </MainLayout>
  )
}