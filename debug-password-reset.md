# 비밀번호 재설정 디버깅 가이드

## 🔍 현재 문제 상황
- URL: https://aikepco.vercel.app/auth/reset-password
- 오류: "잘못된 링크" 메시지 표시
- 원인: URL 파라미터 또는 토큰 처리 문제

## 🧪 디버깅 단계

### 1. 브라우저 개발자 도구 확인
1. 브라우저에서 F12를 눌러 개발자 도구 열기
2. Console 탭 확인
3. 다음 로그 메시지들을 찾아보세요:

```
Full URL: [전체 URL]
Hash: [# 뒤의 내용]
Search: [? 뒤의 내용]
Password reset parameters: {accessToken: ..., refreshToken: ..., type: ...}
```

### 2. 예상되는 URL 형태

#### 올바른 Supabase 리다이렉트 URL
```
https://aikepco.vercel.app/auth/reset-password#access_token=eyJhbGci...&expires_in=3600&refresh_token=abc123...&token_type=bearer&type=recovery
```

#### 현재 접근한 URL이 다음 중 하나인가?
- `https://aikepco.vercel.app/auth/reset-password` (파라미터 없음)
- `https://aikepco.vercel.app/auth/reset-password?...` (query parameter 형태)
- `https://aikepco.vercel.app/auth/reset-password#error=...` (에러 포함)

### 3. Supabase 설정 확인 사항

#### Authentication > Email Templates
1. **Reset Password** 템플릿의 링크가 올바른지 확인
2. `{{ .ConfirmationURL }}`이 올바르게 설정되어 있는지 확인

#### Authentication > URL Configuration
1. **Site URL**: `https://aikepco.vercel.app`
2. **Redirect URLs**에 다음이 포함되어 있는지 확인:
   ```
   https://aikepco.vercel.app/auth/reset-password
   https://localhost:3000/auth/reset-password
   ```

### 4. 이메일 전송 설정 확인

#### PasswordResetModal에서 전송하는 URL
```typescript
const { error } = await supabaseClient.auth.resetPasswordForEmail(
  values.email,
  {
    redirectTo: `${window.location.origin}/auth/reset-password`
  }
)
```

현재 `window.location.origin`이 `https://aikepco.vercel.app`인지 확인

### 5. 임시 해결 방법

#### 직접 접근한 경우 감지 개선
현재 코드에서 파라미터가 전혀 없을 때 'invalid' 상태로 설정하고 있습니다.

#### 에러 상황별 대응
- **직접 접근**: 새 재설정 요청 안내
- **만료된 토큰**: 새 재설정 요청 필요
- **잘못된 토큰**: Supabase 설정 확인 필요

## 🔧 수정 사항

### 개선된 디버깅 로그
- 전체 URL 출력으로 정확한 상황 파악
- 각 파라미터의 존재 여부 확인
- 에러 메시지 상세 출력

### 사용자 안내 개선
- 가능한 원인 명시
- 구체적인 해결 방법 제시
- 새 재설정 요청 버튼 추가

## 🚀 테스트 방법

### 1. 로컬 테스트
```bash
# 개발 서버 실행
npm run dev

# 로그인 모달에서 "비밀번호 찾기" 클릭
# 이메일 주소 입력하여 재설정 요청
# 전송된 이메일의 링크 클릭하여 테스트
```

### 2. 콘솔 로그 확인
브라우저 개발자 도구에서 다음 정보 확인:
- 전체 URL 구조
- 토큰 파라미터 존재 여부
- Supabase 세션 설정 결과

### 3. 네트워크 탭 확인
- Supabase API 호출 상태
- setSession 요청/응답 확인
- 에러 응답 내용 분석

## 📝 예상 해결책

1. **Supabase 리다이렉트 URL 설정 확인**
2. **이메일 템플릿의 올바른 URL 사용**
3. **URL fragment vs query parameter 처리**
4. **토큰 만료 시간 확인**

## 🆘 추가 확인이 필요한 경우

콘솔 로그에서 다음 정보를 확인해주세요:
1. `Full URL: [실제 URL]`
2. `Hash: [# 뒤의 내용]`
3. `Password reset parameters: {...}`
4. 에러 메시지가 있다면 그 내용

이 정보로 정확한 원인을 파악할 수 있습니다.