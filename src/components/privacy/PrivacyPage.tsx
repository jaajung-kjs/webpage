'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Shield, 
  Eye, 
  Lock, 
  Database, 
  UserCheck, 
  Mail, 
  Globe, 
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

export default function PrivacyPage() {
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
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            개인정보 처리방침
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          KEPCO AI 학습동아리는 회원의 개인정보를 보호하고 안전하게 관리합니다
        </p>
        <Badge variant="secondary" className="mt-4">
          <Clock className="mr-1 h-3 w-3" />
          최종 업데이트: {lastUpdated}
        </Badge>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* 개인정보 수집 및 이용 목적 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                개인정보 수집 및 이용 목적
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. 회원 가입 및 관리</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>회원 식별, 가입 의사 확인, 회원 자격 유지 및 관리</li>
                  <li>서비스 부정이용 방지, 각종 고지·통지</li>
                  <li>회원 탈퇴 의사 확인</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. 서비스 제공</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>AI 학습 콘텐츠 제공, 커뮤니티 서비스 제공</li>
                  <li>개인 맞춤형 서비스 제공, 학습 진도 관리</li>
                  <li>이벤트 및 광고성 정보 제공</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. 고충처리</h4>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>회원의 신원 확인, 문의사항 확인, 사실조사를 위한 연락·통지</li>
                  <li>처리결과 통보</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 수집하는 개인정보 항목 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                수집하는 개인정보 항목
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">필수 수집 항목</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">기본 정보</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>이메일 주소</li>
                      <li>이름</li>
                      <li>부서명</li>
                      <li>직급</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h5 className="font-medium mb-2">자동 수집 정보</h5>
                    <ul className="list-disc pl-4 space-y-1 text-sm text-muted-foreground">
                      <li>IP 주소</li>
                      <li>접속 로그</li>
                      <li>서비스 이용 기록</li>
                      <li>쿠키 정보</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">선택 수집 항목</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>전화번호 (연락처)</li>
                    <li>프로필 사진</li>
                    <li>AI 관심 분야 및 전문성 수준</li>
                    <li>자기소개</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 개인정보 보유 및 이용기간 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                개인정보 보유 및 이용기간
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">보유기간 원칙</h4>
                    <p className="text-muted-foreground">
                      회원탈퇴 시까지 또는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">회원정보</h4>
                  <p className="text-muted-foreground">회원탈퇴 시까지</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">서비스 이용기록</h4>
                  <p className="text-muted-foreground">3년 (통신비밀보호법)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">접속로그 기록</h4>
                  <p className="text-muted-foreground">3개월 (통신비밀보호법)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">부정이용 기록</h4>
                  <p className="text-muted-foreground">1년 (내부 정책)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 개인정보 제3자 제공 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-600" />
                개인정보 제3자 제공
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">제3자 제공 안함</h4>
                </div>
                <p className="text-muted-foreground">
                  회사는 회원의 개인정보를 개인정보 처리방침에서 명시한 범위 내에서만 처리하며, 
                  회원의 동의 없이 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 개인정보 처리위탁 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                개인정보 처리위탁
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">수탁업체</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">위탁업무</th>
                      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">보유기간</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Supabase Inc.</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">데이터베이스 및 스토리지 운영</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">회원탈퇴 또는 위탁계약 종료시까지</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Vercel Inc.</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">웹서비스 호스팅</td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">회원탈퇴 또는 위탁계약 종료시까지</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 개인정보 보호를 위한 기술적·관리적 보호조치 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                개인정보 보호조치
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">기술적 보호조치</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>개인정보 암호화 저장 및 전송</li>
                      <li>접근통제시스템 설치 및 운영</li>
                      <li>보안프로그램 설치 및 갱신</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                      <li>개인정보취급시스템 접근기록 보관</li>
                      <li>개인정보 접근권한 최소화</li>
                      <li>정기적인 보안점검</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">관리적 보호조치</h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    <li>개인정보 취급직원의 최소화 및 교육</li>
                    <li>개인정보 보호책임자 등 관리조직 구성</li>
                    <li>내부관리계획 수립 및 시행</li>
                    <li>개인정보 취급직원에 대한 정기적인 교육</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 정보주체의 권리·의무 및 행사방법 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-cyan-600" />
                정보주체의 권리 및 행사방법
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                회원은 언제든지 다음과 같은 개인정보 보호 관련 권리를 행사할 수 있습니다.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">열람·정정·삭제</h4>
                  <p className="text-sm text-muted-foreground">
                    개인정보 처리현황을 확인하고, 잘못된 정보의 수정·삭제를 요구할 수 있습니다.
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">처리정지</h4>
                  <p className="text-sm text-muted-foreground">
                    개인정보 처리를 중단하도록 요구할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">권리 행사 방법</h4>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>개인정보보호책임자에게 서면, 전화, 전자우편 등으로 연락</li>
                  <li>프로필 설정 페이지에서 직접 수정</li>
                  <li>회원탈퇴를 통한 전체 정보 삭제</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 개인정보보호책임자 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-600" />
                개인정보보호책임자
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 다음과 같이 개인정보보호책임자를 지정하고 있습니다.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">개인정보보호책임자</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">성명:</span> 김준성</div>
                    <div><span className="font-medium">직책:</span> 강원본부 전력관리처 전자제어부 주임</div>
                    <div><span className="font-medium">이메일:</span> jaajung@kepco.co.kr</div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-3">개인정보보호담당자</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">성명:</span> 김준성</div>
                    <div><span className="font-medium">직책:</span> 강원본부 전력관리처 전자제어부 주임</div>
                    <div><span className="font-medium">이메일:</span> jaajung@kepco.co.kr</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 처리방침 변경 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>처리방침 변경</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                이 개인정보 처리방침은 {lastUpdated}부터 적용됩니다. 
                법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 경우에는 
                변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}