'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Scale,
  UserX,
  MessageSquare,
  Crown,
  Gavel
} from 'lucide-react'

export default function TermsPage() {
  const lastUpdated = '2025년 8월 1일'

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            이용약관
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          KEPCO AI 학습동아리 서비스 이용에 관한 제반 사항과 기타 필요한 사항을 규정합니다
        </p>
        <Badge variant="secondary" className="mt-4">
          <Clock className="mr-1 h-3 w-3" />
          최종 업데이트: {lastUpdated}
        </Badge>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* 제1조 목적 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                제1조 (목적)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                이 약관은 한국전력공사(이하 "회사")가 운영하는 AI 학습동아리 서비스(이하 "서비스")의 이용조건 및 절차에 관한 사항과 기타 필요한 사항을 규정함을 목적으로 합니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제2조 정의 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                제2조 (정의)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">1. "서비스"</h4>
                  <p className="text-muted-foreground">
                    한국전력공사 직원들을 위한 AI 학습 커뮤니티 플랫폼 및 관련 제반 서비스를 의미합니다.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">2. "회원"</h4>
                  <p className="text-muted-foreground">
                    이 약관에 따라 회사와 이용계약을 체결하고 서비스를 이용하는 한국전력공사 직원을 의미합니다.
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <h4 className="font-semibold mb-2">3. "게시물"</h4>
                  <p className="text-muted-foreground">
                    회원이 서비스에 게시한 문자, 이미지, 동영상, 링크 등의 정보를 의미합니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제3조 약관의 게시와 개정 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                제3조 (약관의 게시와 개정)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 약관의 게시</h4>
                <p className="text-muted-foreground">
                  회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 약관의 개정</h4>
                <p className="text-muted-foreground">
                  회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정된 약관은 시행일 7일 전부터 공지합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제4조 회원가입 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                제4조 (회원가입)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 가입 자격</h4>
                <p className="text-muted-foreground">
                  한국전력공사의 현직 직원으로서, 회사 이메일 주소를 보유한 자에 한해 회원가입이 가능합니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 가입 절차</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>회원가입 신청서 작성</li>
                  <li>이용약관 및 개인정보처리방침 동의</li>
                  <li>회사 이메일 주소 인증</li>
                  <li>관리자 승인</li>
                </ul>
              </div>
              <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-red-800 dark:text-red-300">3. 가입 거부 사유</h4>
                <ul className="list-disc pl-4 space-y-1 text-red-700 dark:text-red-400">
                  <li>회사 직원이 아닌 경우</li>
                  <li>실명이 아니거나 타인의 명의를 이용한 경우</li>
                  <li>허위 정보를 기재한 경우</li>
                  <li>과거 이용제재를 받은 이력이 있는 경우</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제5조 서비스의 제공 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-indigo-600" />
                제5조 (서비스의 제공)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">회사가 제공하는 서비스</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">학습 서비스</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>AI 도구 활용법 공유</li>
                      <li>실무 적용 사례 공유</li>
                      <li>온라인/오프라인 스터디</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">커뮤니티 서비스</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>질문과 답변 게시판</li>
                      <li>자료 공유 플랫폼</li>
                      <li>회원 간 네트워킹</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">서비스 제공 시간</h4>
                <p className="text-muted-foreground">
                  연중무휴 24시간 서비스 제공을 원칙으로 하나, 시스템 점검 등 필요한 경우 서비스를 일시 중단할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제6조 회원의 의무 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                제6조 (회원의 의무)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">회원은 다음 사항을 준수해야 합니다</h4>
                <div className="space-y-3">
                  <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h5 className="font-medium mb-2 text-red-800 dark:text-red-300">금지 행위</h5>
                    <ul className="list-disc pl-4 space-y-1 text-red-700 dark:text-red-400 text-sm">
                      <li>회사 기밀정보나 개인정보 유출</li>
                      <li>타인의 명예를 훼손하거나 모독하는 행위</li>
                      <li>저작권 등 타인의 권리를 침해하는 행위</li>
                      <li>음란물, 폭력적 컨텐츠 게시</li>
                      <li>서비스의 안정적 운영을 방해하는 행위</li>
                    </ul>
                  </div>
                  <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h5 className="font-medium mb-2 text-green-800 dark:text-green-300">권장 사항</h5>
                    <ul className="list-disc pl-4 space-y-1 text-green-700 dark:text-green-400 text-sm">
                      <li>건전한 토론 문화 조성</li>
                      <li>유익한 정보와 지식 공유</li>
                      <li>상호 존중과 배려</li>
                      <li>적극적인 학습 참여</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제7조 게시물의 관리 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-600" />
                제7조 (게시물의 관리)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 게시물의 소유권</h4>
                <p className="text-muted-foreground">
                  회원이 작성한 게시물의 저작권은 회원에게 있으며, 회사는 서비스 운영을 위해 필요한 범위 내에서 사용할 수 있습니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 게시물의 삭제</h4>
                <p className="text-muted-foreground">
                  회사는 다음의 경우 사전 통지 없이 게시물을 삭제하거나 이동할 수 있습니다:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1 text-muted-foreground">
                  <li>본 약관에 위배되는 내용인 경우</li>
                  <li>법령에 위배되는 내용인 경우</li>
                  <li>다른 회원 또는 제3자의 권리를 침해하는 경우</li>
                  <li>기타 회사가 부적절하다고 판단하는 경우</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제8조 서비스 이용의 제한 및 정지 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                제8조 (서비스 이용의 제한 및 정지)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 제재 사유</h4>
                <p className="text-muted-foreground mb-3">
                  회사는 회원이 다음에 해당하는 행위를 하였을 경우 서비스 이용을 제한하거나 정지할 수 있습니다:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">경고 대상</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>부적절한 게시물 작성</li>
                      <li>타 회원과의 갈등 유발</li>
                      <li>서비스 이용 매너 위반</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">정지/탈퇴 대상</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>기밀정보 유출</li>
                      <li>반복적인 약관 위반</li>
                      <li>서비스 운영 방해</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 제재 절차</h4>
                <p className="text-muted-foreground">
                  제재 전 회원에게 사유를 통지하고 소명 기회를 제공합니다. 단, 긴급한 경우 사후 통지할 수 있습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제9조 계약해지 및 탈퇴 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                제9조 (계약해지 및 탈퇴)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 회원의 탈퇴</h4>
                <p className="text-muted-foreground">
                  회원은 언제든지 서비스 이용을 중단하고 탈퇴할 수 있으며, 탈퇴 시 모든 개인정보는 지체없이 삭제됩니다.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 회사의 계약해지</h4>
                <p className="text-muted-foreground">
                  회사는 회원이 본 약관을 현저히 위반하거나 서비스 운영을 현저히 방해한 경우 계약을 해지할 수 있습니다.
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">3. 탈퇴 후 처리</h4>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>개인정보는 즉시 삭제 (법령에 따른 보관 제외)</li>
                  <li>작성한 게시물은 관리자 판단에 따라 유지 또는 삭제</li>
                  <li>탈퇴 후 동일한 정보로 재가입 제한 가능</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 제10조 면책조항 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-gray-600" />
                제10조 (면책조항)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 회사의 면책사항</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>천재지변 또는 불가항력으로 인한 서비스 중단</li>
                  <li>회원의 고의 또는 과실로 인한 손해</li>
                  <li>회원이 게시한 정보, 자료의 신뢰도, 정확성</li>
                  <li>회원 상호간 또는 회원과 제3자 간에 발생한 분쟁</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 분쟁 해결</h4>
                <p className="text-muted-foreground">
                  서비스 이용과 관련하여 발생한 분쟁은 대한민국 법령에 따라 해결하며, 관할법원은 회사 소재지 관할법원으로 합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 부칙 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>부칙</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  <strong>시행일:</strong> 이 약관은 {lastUpdated}부터 시행됩니다.
                </p>
                <p className="text-muted-foreground">
                  <strong>연락처:</strong> 이용약관에 관한 문의사항이 있으시면 다음 연락처로 문의해주시기 바랍니다.
                </p>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>이메일:</strong> jaajung@kepco.co.kr</li>
                    <li><strong>담당부서:</strong> 강원본부 전력관리처 전자제어부</li>
                    <li><strong>운영시간:</strong> 평일 09:00 ~ 18:00</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}