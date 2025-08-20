import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Image 
                src="/images/kepco.svg" 
                alt="KEPCO Logo" 
                width={24} 
                height={24} 
                className="h-6"
                style={{ width: 'auto' }}
              />
              <div>
                <div className="font-bold">KEPCO</div>
                <div className="text-xs text-muted-foreground">AI 학습동아리</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              한국전력공사 강원본부 전력관리처<br />
              생성형 AI 학습동아리
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">빠른 링크</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/cases" className="hover:text-primary transition-colors">
                  AI 활용사례
                </Link>
              </li>
              <li>
                <Link href="/resources" className="hover:text-primary transition-colors">
                  학습자료
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-primary transition-colors">
                  자유게시판
                </Link>
              </li>
              <li>
                <Link href="/activities" className="hover:text-primary transition-colors">
                  활동일정
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">학습자료</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/resources/tutorials" className="hover:text-primary transition-colors">
                  튜토리얼
                </Link>
              </li>
              <li>
                <Link href="/resources/guides" className="hover:text-primary transition-colors">
                  가이드
                </Link>
              </li>
              <li>
                <Link href="/resources/tools" className="hover:text-primary transition-colors">
                  AI 도구
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-primary transition-colors">
                  자주묻는질문
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">연락처</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>강원도 춘천시 후석로 304</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>033-359-2548</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>jaajung@kepco.co.kr</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
            <div className="text-sm text-muted-foreground">
              © 2025 KEPCO. All Rights Reserved.
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                개인정보처리방침
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                이용약관
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}