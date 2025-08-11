import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RPA 도구 | KEPCO AI Community',
  description: 'KEPCO AI Community RPA 자동화 도구',
}

export default function RPALayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}