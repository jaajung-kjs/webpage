# 이메일 템플릿 설정 가이드

## 📧 Supabase 이메일 템플릿 설정

### 1. Supabase 대시보드 접속
1. [Supabase Dashboard](https://app.supabase.com) 접속
2. 프로젝트 선택
3. **Authentication** > **Email Templates** 메뉴로 이동

### 2. 회원가입 인증 템플릿 설정
1. **Confirm signup** 탭 선택
2. `signup-confirmation-simple.html`의 내용을 복사
3. **Message Body (HTML)** 필드에 붙여넣기

**추천 설정:**
- **Subject**: `[KEPCO AI] 이메일 인증을 완료해주세요 🎉`
- **From Email**: `noreply@your-domain.com` (실제 도메인으로 변경)
- **From Name**: `KEPCO AI 학습동아리`

### 3. 비밀번호 재설정 템플릿 설정
1. **Reset Password** 탭 선택
2. `password-reset-simple.html`의 내용을 복사
3. **Message Body (HTML)** 필드에 붙여넣기

**추천 설정:**
- **Subject**: `[KEPCO AI] 비밀번호 재설정 안내 🔐`
- **From Email**: `noreply@your-domain.com` (실제 도메인으로 변경)
- **From Name**: `KEPCO AI 학습동아리`

### 4. 도메인 설정 (프로덕션용)
1. **Settings** > **Authentication** 이동
2. **Site URL** 설정: `https://your-domain.com`
3. **Additional Redirect URLs** 추가:
   ```
   https://your-domain.com/auth/reset-password
   https://localhost:3000/auth/reset-password (개발용)
   ```

## 📝 템플릿 파일 설명

### 회원가입 인증 이메일
#### `signup-confirmation.html`
- **용도**: 완전한 HTML 회원가입 인증 이메일
- **특징**: 환영 메시지, 커뮤니티 소개, 회원 혜택 안내, 반응형 디자인
- **사용**: 자체 이메일 서버 또는 고급 이메일 서비스

#### `signup-confirmation-simple.html`
- **용도**: Supabase 대시보드 직접 사용 (회원가입)
- **특징**: 인라인 스타일, 핵심 기능 + 커뮤니티 정보
- **사용**: Supabase Authentication 이메일 템플릿

### 비밀번호 재설정 이메일
#### `password-reset.html`
- **용도**: 완전한 HTML 비밀번호 재설정 이메일
- **특징**: 보안 안내, 경고 메시지, 반응형 디자인
- **사용**: 자체 이메일 서버 또는 고급 이메일 서비스

#### `password-reset-simple.html`
- **용도**: Supabase 대시보드 직접 사용 (비밀번호 재설정)
- **특징**: 간단한 인라인 스타일, 핵심 기능만 포함
- **사용**: Supabase Authentication 이메일 템플릿

## 🔧 템플릿 커스터마이징

### 색상 변경
```css
/* 주 색상 */
#0066cc → 원하는 색상으로 변경

/* 그라데이션 */
background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
```

### 로고 변경
```html
<!-- 텍스트 로고를 이미지로 변경 -->
<div class="logo">⚡ KEPCO AI 학습동아리</div>
↓
<img src="https://your-domain.com/logo.png" alt="로고" style="height: 40px;">
```

### 연락처 정보 수정
```html
<a href="mailto:support@kepco-ai-community.com">지원팀 문의</a>
```

## 🧪 테스트 방법

### 1. 로컬 테스트

#### 회원가입 테스트
```bash
# 개발 서버 실행
npm run dev

# 홈페이지에서 회원가입 진행
# 테스트 이메일로 가입 시도
```

#### 비밀번호 재설정 테스트
```bash
# 개발 서버 실행
npm run dev

# 로그인 페이지에서 "비밀번호를 잊으셨나요?" 클릭
# 테스트 이메일로 재설정 요청
```

### 2. 이메일 수신 확인
- 스팸함 확인
- **회원가입**: 링크 클릭하여 인증 완료
- **비밀번호 재설정**: 링크 클릭하여 재설정 페이지 접속 후 새 비밀번호 설정

### 3. 다양한 이메일 클라이언트 테스트
- Gmail, Outlook, Apple Mail 등에서 확인
- 모바일 이메일 앱에서도 확인

## 📱 모바일 최적화

템플릿은 반응형으로 제작되어 다음과 같이 최적화됩니다:

- **모바일**: 버튼 크기 확대, 텍스트 가독성 향상
- **태블릿**: 적절한 여백과 폰트 크기 유지  
- **데스크톱**: 풍부한 시각적 요소와 상세 정보 표시

## 🔒 보안 고려사항

1. **링크 유효시간**: 1시간으로 제한
2. **HTTPS 필수**: 모든 링크는 HTTPS 사용
3. **피싱 방지**: 명확한 발신자 정보 표시
4. **토큰 보안**: URL에 민감 정보 노출 방지

## 📊 모니터링

### 이메일 전송 모니터링
- Supabase 대시보드에서 Authentication 로그 확인
- 이메일 전송 실패율 모니터링
- 사용자 피드백 수집

### 개선 포인트 추적
- 이메일 오픈율
- 링크 클릭률  
- 재설정 완료율
- 사용자 만족도