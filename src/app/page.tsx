'use client'

export const dynamic = 'force-dynamic'

import MainLayout from '@/components/layout/MainLayout'
import HeroSection from '@/components/sections/HeroSection'
import FeaturesSection from '@/components/sections/FeaturesSection'
import StatsSection from '@/components/sections/StatsSection'
import RecentPostsSection from '@/components/sections/RecentPostsSection'

export default function Home() {
  return (
    <MainLayout>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <RecentPostsSection />
    </MainLayout>
  )
}
