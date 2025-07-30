'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Menu, User, LogOut, Settings, Shield, Zap, MessageCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { MessageModal, useMessageModal, MessageNotificationBadge } from '@/components/messages'
import LoginDialog from '@/components/auth/LoginDialog'

const navigation = [
  { name: '홈', href: '/' },
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
  const { user, profile, signOut, loading, isMember } = useAuth()
  const { openModal, modalProps } = useMessageModal()
  const router = useRouter()
  
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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg kepco-gradient">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="hidden font-bold sm:inline-block">
              <span className="kepco-text-gradient">KEPCO</span>
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
                    className="relative hidden sm:flex"
                  >
                    <MessageCircle className="h-4 w-4" />
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
                    onClick={async () => {
                      const result = await signOut()
                      if (result?.error) {
                        console.error('Logout failed:', result.error)
                      }
                    }}
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
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">메뉴 토글</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="pr-0">
                <SheetHeader>
                  <SheetTitle className="sr-only">메뉴</SheetTitle>
                  <SheetDescription className="sr-only">
                    사이트 내비게이션 메뉴
                  </SheetDescription>
                </SheetHeader>
                <MobileNav />
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

function MobileNav() {
  const { user, profile, signOut, isMember } = useAuth()
  const { openModal } = useMessageModal()
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const [loginDialogTab, setLoginDialogTab] = useState('login')
  const router = useRouter()

  return (
    <div className="my-4 h-[calc(100vh-8rem)] pb-10 px-6">
      <div className="flex items-center space-x-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg kepco-gradient">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="kepco-text-gradient font-bold">KEPCO</span>
          <div className="text-xs text-muted-foreground">AI 학습동아리</div>
        </div>
      </div>
      <div className="my-4 h-px bg-border" />
      <div className="flex flex-col space-y-3">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            {item.name}
          </Link>
        ))}
      </div>
      <div className="mt-6 flex flex-col space-y-4 pr-2">
        {user ? (
          <>
            <div className="flex items-center space-x-2 p-2">
              <Avatar className="h-8 w-8">
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
            <Button variant="outline" size="sm" asChild>
              <Link href="/profile">프로필</Link>
            </Button>
            {isMember && (
              <Button variant="outline" size="sm" onClick={() => openModal()}>
                <MessageCircle className="h-4 w-4 mr-2" />
                메시지
              </Button>
            )}
            {['admin', 'leader', 'vice-leader'].includes(profile?.role || '') && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-primary"
                onClick={() => router.push('/admin')}
              >
                관리자 대시보드
              </Button>
            )}
            {profile?.role === 'guest' && (
              <Button variant="outline" size="sm" asChild className="text-primary">
                <Link href="/membership/apply">동아리 가입 신청</Link>
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const result = await signOut()
                if (result?.error) {
                  console.error('Logout failed:', result.error)
                }
              }}
              className="text-red-600"
            >
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setLoginDialogTab('login')
                  setLoginDialogOpen(true)
                }}
                className="w-full"
              >
                로그인
              </Button>
              <Button 
                size="sm" 
                className="kepco-gradient w-full" 
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
  )
}