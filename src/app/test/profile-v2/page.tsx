/**
 * Profile V2 테스트 페이지
 * 
 * 새로운 프로필 시스템과 기존 시스템을 비교 테스트
 * 라이브 서비스 영향 없이 성능과 데이터 일관성 확인
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  Activity,
  Database,
  Zap
} from 'lucide-react'
import { useAuth } from '@/providers'
import { useUserProfileComplete, useCheckAchievements } from '@/hooks/features/useProfileV2'
import { useUserProfile, useUserStats, useUserActivities } from '@/hooks/features/useProfile'

export default function ProfileV2TestPage() {
  const { user } = useAuth()
  const [testUserId, setTestUserId] = useState<string>(user?.id || '')
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({})

  // 새 시스템 (V2) - 업적 데이터 통합
  const startTimeV2 = performance.now()
  const { 
    data: profileV2, 
    isLoading: loadingV2, 
    error: errorV2,
    refetch: refetchV2 
  } = useUserProfileComplete(testUserId, true, 10, true) // 업적 포함
  const endTimeV2 = performance.now()
  
  // 업적 데이터는 이제 profileV2에 포함됨
  const achievementData = profileV2?.achievements
  const achievementLoading = loadingV2
  const achievementError = errorV2
  
  const checkAchievementsMutation = useCheckAchievements()

  // 기존 시스템 (V1)
  const startTimeV1 = performance.now()
  const { data: profileV1, isLoading: loadingV1_1 } = useUserProfile(testUserId)
  const { data: statsV1, isLoading: loadingV1_2 } = useUserStats(testUserId)
  const { data: activitiesV1, isLoading: loadingV1_3 } = useUserActivities(testUserId)
  const endTimeV1 = performance.now()
  const loadingV1 = loadingV1_1 || loadingV1_2 || loadingV1_3

  // 통계 갱신 (아직 미구현)
  const refreshStats = () => console.log('Refresh stats not implemented yet')
  const refreshing = false

  // 성능 비교 메트릭 계산
  const calculateMetrics = () => {
    const v2Time = endTimeV2 - startTimeV2
    const v1Time = endTimeV1 - startTimeV1
    const improvement = ((v1Time - v2Time) / v1Time * 100).toFixed(1)

    setPerformanceMetrics({
      v2Time: v2Time.toFixed(2),
      v1Time: v1Time.toFixed(2),
      improvement: improvement,
      v2Calls: 1, // 단일 RPC 호출
      v1Calls: 3, // 3개의 개별 Hook 호출
      dataConsistency: compareData()
    })
  }

  // 데이터 일관성 비교
  const compareData = () => {
    if (!profileV2 || !profileV1 || !statsV1) return 'pending'
    
    const checks = []
    
    // 기본 정보 비교
    checks.push(profileV2.profile?.name === profileV1.name)
    checks.push(profileV2.profile?.email === profileV1.email)
    
    // 통계 비교
    checks.push(profileV2.stats?.posts_count === statsV1.posts_count)
    checks.push(profileV2.stats?.comments_count === statsV1.comments_count)
    
    return checks.every(check => check) ? 'consistent' : 'inconsistent'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Profile System V2 테스트
            </CardTitle>
            <CardDescription>
              새로운 통합 프로필 시스템과 기존 시스템 비교 테스트
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={() => {
                  refetchV2()
                  calculateMetrics()
                }}
                disabled={loadingV2}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingV2 ? 'animate-spin' : ''}`} />
                데이터 새로고침
              </Button>
              <Button 
                onClick={() => refreshStats()}
                disabled={refreshing}
                variant="outline"
              >
                <Database className={`mr-2 h-4 w-4 ${refreshing ? 'animate-pulse' : ''}`} />
                통계 갱신
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              성능 비교
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {performanceMetrics.v2Time || '0'}ms
                </div>
                <div className="text-sm text-muted-foreground">
                  V2 응답 시간 (1 call)
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {performanceMetrics.v1Time || '0'}ms
                </div>
                <div className="text-sm text-muted-foreground">
                  V1 응답 시간 (3 calls)
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {performanceMetrics.improvement || '0'}%
                </div>
                <div className="text-sm text-muted-foreground">
                  성능 개선
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Comparison */}
        <Tabs defaultValue="v2" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="v2">V2 (새 시스템)</TabsTrigger>
            <TabsTrigger value="achievements">업적 시스템</TabsTrigger>
            <TabsTrigger value="v1">V1 (기존 시스템)</TabsTrigger>
            <TabsTrigger value="compare">비교</TabsTrigger>
          </TabsList>

          <TabsContent value="v2" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>V2 프로필 데이터</CardTitle>
                <CardDescription>통합 RPC 함수 결과</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingV2 ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : errorV2 ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{errorV2.message}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* Profile Info */}
                    <div>
                      <h4 className="font-semibold mb-2">프로필 정보</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(profileV2?.profile, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Stats */}
                    <div>
                      <h4 className="font-semibold mb-2">통계</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(profileV2?.stats, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Recent Activities */}
                    <div>
                      <h4 className="font-semibold mb-2">최근 활동</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(profileV2?.recent_activities, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Achievements (Integrated) */}
                    <div>
                      <h4 className="font-semibold mb-2">업적 (통합 데이터)</h4>
                      <div className="mb-2 text-sm text-muted-foreground">
                        이제 한 번의 RPC 호출로 모든 데이터를 가져옵니다!
                      </div>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs max-h-96">
                        {JSON.stringify(profileV2?.achievements, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>업적 시스템 데이터</CardTitle>
                <CardDescription>DB 기반 업적 진행률 시스템</CardDescription>
              </CardHeader>
              <CardContent>
                {achievementLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : achievementError ? (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{achievementError.message}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {/* 업적 통계 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {achievementData?.filter(a => a.is_completed).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">완료된 업적</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {achievementData?.length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">전체 업적</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {achievementData?.filter(a => a.is_completed)
                            .reduce((sum, a) => sum + a.points, 0) || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">획득 포인트</div>
                      </div>
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {achievementData?.filter(a => !a.is_completed && a.progress_percentage > 0).length || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">진행 중</div>
                      </div>
                    </div>
                    
                    {/* 업적 체크 버튼 */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          checkAchievementsMutation.mutate()
                          refetchV2() // 프로필 전체 데이터 새로고침
                        }}
                        disabled={checkAchievementsMutation.isPending}
                        variant="outline"
                      >
                        {checkAchievementsMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            업적 체크 중...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            업적 체크
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* 진행 중인 업적 TOP 5 */}
                    <div>
                      <h4 className="font-semibold mb-2">진행 중인 업적 (TOP 5)</h4>
                      <div className="space-y-2">
                        {achievementData
                          ?.filter(a => !a.is_completed && a.progress_percentage > 0)
                          .sort((a, b) => b.progress_percentage - a.progress_percentage)
                          .slice(0, 5)
                          .map((achievement) => (
                            <div key={achievement.achievement_id} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">
                                  {achievement.icon} {achievement.name}
                                </span>
                                <Badge variant={
                                  achievement.tier === 'platinum' ? 'default' :
                                  achievement.tier === 'gold' ? 'secondary' :
                                  achievement.tier === 'silver' ? 'outline' :
                                  'outline'
                                }>
                                  {achievement.tier}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mb-2">
                                {achievement.description}
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span>{achievement.current_progress}/{achievement.requirement_count}</span>
                                <span>{achievement.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                  style={{ width: `${achievement.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {/* 전체 업적 데이터 */}
                    <div>
                      <h4 className="font-semibold mb-2">전체 업적 데이터 (JSON)</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs max-h-96">
                        {JSON.stringify(achievementData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="v1" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>V1 프로필 데이터</CardTitle>
                <CardDescription>기존 시스템 (3개 Hook)</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingV1 ? (
                  <div className="flex items-center justify-center py-8">
                    <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Profile Info */}
                    <div>
                      <h4 className="font-semibold mb-2">프로필 정보</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(profileV1, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Stats */}
                    <div>
                      <h4 className="font-semibold mb-2">통계</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(statsV1, null, 2)}
                      </pre>
                    </div>
                    
                    {/* Activities */}
                    <div>
                      <h4 className="font-semibold mb-2">최근 활동</h4>
                      <pre className="bg-muted p-4 rounded overflow-auto text-xs">
                        {JSON.stringify(activitiesV1, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compare" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>데이터 일관성 검증</CardTitle>
                <CardDescription>V1과 V2 데이터 비교</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Consistency Check */}
                  <Alert className={
                    performanceMetrics.dataConsistency === 'consistent' 
                      ? 'border-green-500' 
                      : performanceMetrics.dataConsistency === 'inconsistent'
                      ? 'border-red-500'
                      : ''
                  }>
                    {performanceMetrics.dataConsistency === 'consistent' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : performanceMetrics.dataConsistency === 'inconsistent' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>
                      {performanceMetrics.dataConsistency === 'consistent' 
                        ? '데이터 일관성 확인됨'
                        : performanceMetrics.dataConsistency === 'inconsistent'
                        ? '데이터 불일치 발견'
                        : '검증 대기 중'}
                    </AlertTitle>
                    <AlertDescription>
                      두 시스템 간 데이터가 {
                        performanceMetrics.dataConsistency === 'consistent'
                          ? '일치합니다.'
                          : performanceMetrics.dataConsistency === 'inconsistent'
                          ? '일치하지 않습니다. 상세 내용을 확인하세요.'
                          : '검증을 위해 데이터를 로드하세요.'
                      }
                    </AlertDescription>
                  </Alert>

                  {/* Detailed Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">기본 정보 비교</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">이름</span>
                          <Badge variant={
                            profileV2?.profile?.name === profileV1?.name 
                              ? 'default' 
                              : 'destructive'
                          }>
                            {profileV2?.profile?.name === profileV1?.name ? '일치' : '불일치'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">이메일</span>
                          <Badge variant={
                            profileV2?.profile?.email === profileV1?.email 
                              ? 'default' 
                              : 'destructive'
                          }>
                            {profileV2?.profile?.email === profileV1?.email ? '일치' : '불일치'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">부서</span>
                          <Badge variant={
                            profileV2?.profile?.department === profileV1?.department 
                              ? 'default' 
                              : 'destructive'
                          }>
                            {profileV2?.profile?.department === profileV1?.department ? '일치' : '불일치'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">통계 비교</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">게시글 수</span>
                          <Badge variant={
                            profileV2?.stats?.posts_count === statsV1?.posts_count 
                              ? 'default' 
                              : 'destructive'
                          }>
                            V2: {profileV2?.stats?.posts_count || 0} / V1: {statsV1?.posts_count || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">댓글 수</span>
                          <Badge variant={
                            profileV2?.stats?.comments_count === statsV1?.comments_count 
                              ? 'default' 
                              : 'destructive'
                          }>
                            V2: {profileV2?.stats?.comments_count || 0} / V1: {statsV1?.comments_count || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">받은 좋아요</span>
                          <Badge variant={
                            profileV2?.stats?.total_likes_received === statsV1?.likes_received 
                              ? 'default' 
                              : 'destructive'
                          }>
                            V2: {profileV2?.stats?.total_likes_received || 0} / V1: {statsV1?.likes_received || 0}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Migration Readiness */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  마이그레이션 준비 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">새 스키마 생성 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Materialized View 생성 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">통합 RPC 함수 생성 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">TypeScript 타입 정의 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">새 Hook 개발 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">업적 시스템 DB 통합 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {performanceMetrics.dataConsistency === 'consistent' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm">데이터 일관성 검증</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}