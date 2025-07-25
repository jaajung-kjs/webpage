import { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import { Toaster } from '@/components/ui/sonner'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  )
}