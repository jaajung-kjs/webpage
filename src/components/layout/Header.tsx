'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Menu, User, LogOut, Settings, Shield, MessageCircle } from 'lucide-react'
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth'
import { sessionManager } from '@/lib/utils/session-manager'
import { MessageModal, useMessageModal, MessageNotificationBadge } from '@/components/messages'
import LoginDialog from '@/components/auth/LoginDialog'

const navigation = [
  { name: 'AI 활용사례', href: '/cases' },
  { name: '학습자료', href: '/resources' },
  { name: '자유게시판', href: '/community' },
  { name: '활동일정', href: '/activities' },
  { name: '공지사항', href: '/announcements' },
  { name: '회원목록', href: '/members' },
]

export default function Header() {
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [loginDialogTab, setLoginDialogTab] = useState('login')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, profile, loading, isMember } = useOptimizedAuth()
  const { openModal, modalProps } = useMessageModal()
  const router = useRouter()
  
  const handleSignOut = async () => {
    await sessionManager.signOut()
    router.push('/')
  }
  
  // Listen for login dialog open events
  useEffect(() => {
    const handleOpenLoginDialog = (event: any) => {
      setLoginDialogTab(event.detail?.tab || 'login')
      setLoginDialogOpen(true)
    }
    
    window.addEventListener('openLoginDialog', handleOpenLoginDialog)
    return () => window.removeEventListener('openLoginDialog', handleOpenLoginDialog)
  }, [])
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image 
              src="/images/kepco.svg" 
              alt="KEPCO Logo" 
              width={24} 
              height={24} 
              className="h-6 w-auto"
              priority
            />
            <div className="hidden font-bold sm:inline-block">
              <span className="ml-1 text-sm text-muted-foreground">AI 학습동아리</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="hidden sm:flex sm:items-center sm:space-x-2">
                <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              </div>
            ) : user ? (
              <>
                {/* Message Button - Only for members */}
                {isMember && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openModal()}
                    className="relative flex h-9 w-9 sm:h-8 sm:w-auto sm:px-3"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline-block sm:ml-2">메시지</span>
                    <MessageNotificationBadge className="-top-1 -right-1" />
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || undefined} alt="사용자" />
                        <AvatarFallback>
                          {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5 text-sm font-medium">
                    {profile?.name || user?.email || 'User'}
                  </div>
                  <div className="px-2 pb-1.5 text-xs text-muted-foreground">
                    {profile?.department}
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>프로필</span>
                    </Link>
                  </DropdownMenuItem>
                  {isMember && (
                    <DropdownMenuItem onClick={() => openModal()}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      <span>메시지</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>설정</span>
                    </Link>
                  </DropdownMenuItem>
                  {['admin', 'leader', 'vice-leader'].includes(profile?.role || '') && (
                    <DropdownMenuItem 
                      onClick={() => {
                        console.log('Admin dashboard clicked, user role:', profile?.role)
                        router.push('/admin')
                      }} 
                      className="text-primary cursor-pointer"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      <span>관리자 대시보드</span>
                    </DropdownMenuItem>
                  )}
                  {profile?.role === 'guest' && (
                    <DropdownMenuItem asChild>
                      <Link href="/membership/apply" className="text-primary">
                        <User className="mr-2 h-4 w-4" />
                        <span>동아리 가입 신청</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>로그아웃</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <div className="hidden sm:flex sm:items-center sm:space-x-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  setLoginDialogTab('login')
                  setLoginDialogOpen(true)
                }}>
                  로그인
                </Button>
                <Button size="sm" className="kepco-gradient" onClick={() => {
                  setLoginDialogTab('signup')
                  setLoginDialogOpen(true)
                }}>
                  회원가입
                </Button>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden touch-highlight"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴 토글</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[85vw] max-w-sm">
                <SheetHeader className="sr-only">
                  <SheetTitle>메뉴</SheetTitle>
                  <SheetDescription>
                    사이트 내비게이션 메뉴
                  </SheetDescription>
                </SheetHeader>
                <MobileNav onClose={() => setMobileMenuOpen(false)} onOpenMessage={openModal} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        defaultTab={loginDialogTab}
      />
      
      {/* Message Modal */}
      <MessageModal {...modalProps} />
    </header>
  )
}

function MobileNav({ onClose, onOpenMessage }: { onClose?: () => void, onOpenMessage?: () => void }) {
  const { user, profile, isMember } = useOptimizedAuth()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [loginDialogTab, setLoginDialogTab] = useState('login')
  const router = useRouter()
  
  const handleSignOut = async () => {
    await sessionManager.signOut()
    router.push('/')
  }
  
  const handleMessageClick = () => {
    onClose?.() // Close the sheet first
    setTimeout(() => {
      onOpenMessage?.()
    }, 300) // Delay to allow sheet closing animation
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center space-x-2">
          <Image 
            src="/images/kepco.svg" 
            alt="KEPCO Logo" 
            width={24} 
            height={24} 
            className="h-6 w-auto"
          />
          <div className="text-xs text-muted-foreground">AI 학습동아리</div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 -webkit-overflow-scrolling-touch">
        {/* Navigation Links */}
        <nav className="space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="block py-3 px-3 -mx-3 text-sm font-medium transition-colors hover:text-primary hover:bg-accent rounded-lg touch-manipulation sheet-nav-item"
          >
            {item.name}
          </Link>
        ))}
        </nav>
        
        {/* User Section */}
        <div className="mt-6 pt-6 border-t space-y-3">
        {user ? (
          <>
            <div className="flex items-center space-x-3 p-3 -mx-3 rounded-lg bg-accent/50">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || undefined} alt="사용자" />
                <AvatarFallback>
                  {profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{profile?.name || user?.email || 'User'}</div>
                <div className="text-xs text-muted-foreground">{profile?.department}</div>
              </div>
            </div>
            <Button variant="outline" size="default" asChild className="w-full justify-start h-11">
              <Link href="/profile">
                <User className="h-4 w-4 mr-2" />
                프로필
              </Link>
            </Button>
            {isMember && (
              <Button 
                variant="outline" 
                size="default" 
                onClick={handleMessageClick} 
                className="w-full justify-start h-11 relative"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                메시지
                <MessageNotificationBadge className="absolute top-2 left-8" />
              </Button>
            )}
            {['admin', 'leader', 'vice-leader'].includes(profile?.role || '') && (
              <Button 
                variant="outline" 
                size="default" 
                className="w-full justify-start h-11 text-primary"
                onClick={() => router.push('/admin')}
              >
                <Shield className="h-4 w-4 mr-2" />
                관리자 대시보드
              </Button>
            )}
            {profile?.role === 'guest' && (
              <Button variant="outline" size="default" asChild className="w-full justify-start h-11 text-primary">
                <Link href="/membership/apply">
                  <User className="h-4 w-4 mr-2" />
                  동아리 가입 신청
                </Link>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="default" 
              onClick={handleSignOut}
              className="w-full justify-start h-11 text-red-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 mr-2" />
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="default" 
                onClick={() => {
                  setLoginDialogTab('login')
                  setLoginDialogOpen(true)
                }}
                className="w-full h-11"
              >
                로그인
              </Button>
              <Button 
                size="default" 
                className="kepco-gradient w-full h-11" 
                onClick={() => {
                  setLoginDialogTab('signup')
                  setLoginDialogOpen(true)
                }}
              >
                회원가입
              </Button>
            </div>
            <LoginDialog
              open={loginDialogOpen}
              onOpenChange={setLoginDialogOpen}
              defaultTab={loginDialogTab}
            />
          </>
        )}
        </div>
      </div>
      
      {/* Bottom Safe Area */}
      <div className="h-safe pb-safe" />
    </div>
  )
}