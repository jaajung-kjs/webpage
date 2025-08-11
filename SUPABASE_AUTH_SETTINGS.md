# Supabase Auth 보안 설정 가이드

## 🚨 필수 보안 설정 (Supabase Dashboard에서 설정)

### 1. OTP 만료 시간 단축
**현재 문제**: OTP 만료 시간이 1시간 이상으로 설정되어 있음
**권장 설정**: 
- Supabase Dashboard → Authentication → Providers → Email
- OTP Expiry: **900초 (15분)** 또는 **1800초 (30분)**으로 변경

### 2. 유출된 비밀번호 보호 활성화
**현재 문제**: Leaked Password Protection이 비활성화되어 있음
**권장 설정**:
- Supabase Dashboard → Authentication → Security
- **Enable Leaked Password Protection** 체크
- HaveIBeenPwned 데이터베이스를 통해 유출된 비밀번호 차단

### 3. 추가 권장 보안 설정

#### 비밀번호 정책 강화
- Minimum password length: **8자 이상**
- Password strength: **Strong** 이상
- Require uppercase, lowercase, numbers, special characters

#### Rate Limiting 설정
- Email rate limit: **3 emails per hour**
- SMS rate limit: **3 SMS per hour** 
- Sign-up rate limit: **10 per hour per IP**

#### MFA (Multi-Factor Authentication)
- MFA 활성화 고려
- TOTP (Time-based One-Time Password) 지원

## ✅ 완료된 보안 개선사항

### 1. Database Function Search Path 보안 (완료)
- 모든 public 함수에 `search_path = public, pg_catalog, pg_temp` 설정
- Schema hijacking 공격 방지

### 2. 성능 최적화 (완료)  
- 사용되지 않는 16개 인덱스 제거
- Write 성능 향상 및 스토리지 절감

## 📋 설정 확인 방법

1. Supabase Dashboard 접속
2. Authentication → Providers → Email 확인
3. Authentication → Security 확인
4. 위 권장사항대로 설정 변경

## 🔐 보안 모니터링

정기적으로 다음 명령어로 보안 상태 확인:
```sql
-- Advisor 실행 (코드에서)
await supabase.rpc('get_advisors', { type: 'security' })
```

## 📝 참고 링크
- [Supabase Auth Security Best Practices](https://supabase.com/docs/guides/auth/password-security)
- [Going to Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod#security)