-- Insert sample profiles (these will be created when users sign up, but we can add some sample data)
-- Note: In production, these would be created through actual user registration

-- Sample cases
INSERT INTO cases (id, title, content, category, subcategory, author_id, tags, tools, difficulty, time_required, is_featured) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ChatGPT를 활용한 업무 보고서 자동화', 
'안녕하세요! 전력관리처에서 근무하는 김전력입니다.

오늘은 제가 최근에 도입한 ChatGPT를 활용한 업무 보고서 자동화 사례를 공유하고자 합니다.

## 배경

매월 작성해야 하는 업무 보고서가 있는데, 항상 비슷한 형식이지만 데이터를 정리하고 분석하는 데 많은 시간이 걸렸습니다. 특히 다음과 같은 어려움이 있었습니다:

- 데이터 수집 및 정리에 3-4시간 소요
- 보고서 작성 및 검토에 2-3시간 소요  
- 매월 반복되는 단순 업무로 인한 피로감

## 해결 방법

ChatGPT를 활용해서 다음과 같이 업무를 자동화했습니다:

### 1. 데이터 분석 프롬프트 작성
```
다음 전력 사용량 데이터를 분석해서 전월 대비 증감률과 주요 특이사항을 정리해줘:
[데이터 입력]

분석 결과를 다음 형식으로 작성해줘:
1. 전월 대비 증감률
2. 주요 변동 요인
3. 향후 전망
```

### 2. 보고서 템플릿 활용
보고서의 기본 구조를 ChatGPT에게 학습시키고, 매월 데이터만 업데이트하면 자동으로 보고서가 생성되도록 했습니다.

### 3. 검토 및 수정
생성된 보고서를 ChatGPT에게 다시 검토 요청해서 오류나 누락된 부분을 확인하고 개선했습니다.

## 결과

- **시간 단축**: 기존 6-7시간 → 2-3시간 (약 50% 단축)
- **품질 향상**: 일관된 형식과 분석 기준 적용
- **업무 만족도**: 반복 업무 줄어들어 창의적 업무에 집중 가능

## 활용 팁

1. **프롬프트 최적화**: 처음에는 결과가 만족스럽지 않을 수 있으니 프롬프트를 계속 개선하세요.
2. **템플릿 활용**: 자주 사용하는 보고서 형식은 템플릿으로 만들어두면 효율적입니다.
3. **검증 필수**: AI가 생성한 내용은 반드시 검토하고 사실 확인을 해야 합니다.

## 마무리

ChatGPT를 활용한 업무 자동화로 시간을 크게 절약할 수 있었습니다. 다른 분들도 본인의 업무에 맞게 활용해보시기 바랍니다.

질문이나 궁금한 점이 있으시면 언제든지 댓글로 남겨주세요!',
'productivity', 'automation', '550e8400-e29b-41d4-a716-446655440000',
ARRAY['ChatGPT', '업무자동화', '보고서', '생산성'],
ARRAY['ChatGPT'], 'intermediate', '1-2시간', true),

('550e8400-e29b-41d4-a716-446655440002', 'Claude를 활용한 문서 요약 및 번역', 
'Claude AI를 활용해서 긴 영문 기술 문서를 효율적으로 요약하고 번역하는 방법을 공유합니다.

## 배경
업무상 영문 기술 문서를 자주 읽어야 하는데, 시간이 많이 걸리고 중요한 내용을 놓치는 경우가 있었습니다.

## 활용 방법
1. Claude에게 문서의 핵심 내용 요약 요청
2. 전문 용어에 대한 상세 설명 요청
3. 한국어로 자연스럽게 번역

## 결과
- 문서 이해 시간 70% 단축
- 번역 품질 크게 향상
- 전문 용어 학습 효과',
'productivity', 'documentation', '550e8400-e29b-41d4-a716-446655440000',
ARRAY['Claude', '번역', '요약', '문서'],
ARRAY['Claude'], 'beginner', '30분-1시간', false),

('550e8400-e29b-41d4-a716-446655440003', 'GitHub Copilot으로 코딩 효율성 2배 향상', 
'개발 업무에서 GitHub Copilot을 도입해서 코딩 효율성을 크게 높인 사례를 공유합니다.

## 도입 배경
반복적인 코드 작성과 함수 구현에 많은 시간을 소모하고 있었습니다.

## 활용 방법
1. 주석으로 함수의 기능을 명시
2. Copilot이 제안하는 코드를 검토 후 채택
3. 리팩토링 시 Copilot의 제안 활용

## 결과
- 코딩 속도 2배 향상
- 버그 감소
- 새로운 패턴 학습',
'development', 'coding', '550e8400-e29b-41d4-a716-446655440000',
ARRAY['GitHub Copilot', '개발', '코딩', '효율성'],
ARRAY['GitHub Copilot'], 'advanced', '1-2시간', true);

-- Sample resources
INSERT INTO resources (id, title, description, category, type, url, tags, author_id) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'ChatGPT 완벽 가이드', 
'ChatGPT를 업무에 효과적으로 활용하는 방법을 단계별로 설명하는 종합 가이드입니다.',
'tutorial', 'guide', 'https://example.com/chatgpt-guide',
ARRAY['ChatGPT', '기초', '업무활용'], '550e8400-e29b-41d4-a716-446655440000'),

('660e8400-e29b-41d4-a716-446655440002', 'Claude AI 활용 워크샵 자료', 
'2024년 1월 워크샵에서 사용된 Claude AI 활용법과 실습 자료입니다.',
'workshop', 'presentation', '/downloads/claude-workshop.pdf',
ARRAY['Claude', '워크샵', '실습'], '550e8400-e29b-41d4-a716-446655440000'),

('660e8400-e29b-41d4-a716-446655440003', 'GitHub Copilot 설치 및 설정', 
'GitHub Copilot을 처음 사용하는 분들을 위한 설치 및 초기 설정 방법입니다.',
'tutorial', 'video', 'https://youtube.com/watch?v=example',
ARRAY['GitHub Copilot', '설치', '설정'], '550e8400-e29b-41d4-a716-446655440000'),

('660e8400-e29b-41d4-a716-446655440004', '프롬프트 엔지니어링 템플릿', 
'효과적인 AI 프롬프트 작성을 위한 템플릿과 예시 모음입니다.',
'template', 'document', '/downloads/prompt-templates.docx',
ARRAY['프롬프트', '템플릿', '작성법'], '550e8400-e29b-41d4-a716-446655440000');

-- Sample activities
INSERT INTO activities (id, title, description, category, status, date, time, duration, location, max_participants, instructor_id, tags) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'ChatGPT 고급 활용법 워크샵', 
'ChatGPT를 업무에 효과적으로 활용하는 고급 기법을 배우고 실습하는 시간입니다.',
'workshop', 'upcoming', '2024-02-15', '14:00', 120, '강원본부 2층 회의실', 20,
'550e8400-e29b-41d4-a716-446655440000', ARRAY['ChatGPT', '워크샵', '실습']),

('770e8400-e29b-41d4-a716-446655440002', 'AI 윤리 토론회', 
'생성형 AI 사용에 있어서 윤리적 고려사항과 올바른 활용 방안에 대해 토론합니다.',
'discussion', 'upcoming', '2024-02-10', '15:30', 90, '온라인 (Zoom)', 30,
'550e8400-e29b-41d4-a716-446655440000', ARRAY['AI윤리', '토론', '정책']),

('770e8400-e29b-41d4-a716-446655440003', 'Claude AI 활용 세미나', 
'Claude AI의 특징과 업무 적용 사례를 공유하고 실제 사용법을 익힙니다.',
'seminar', 'completed', '2024-01-28', '13:00', 150, '강원본부 3층 세미나실', 25,
'550e8400-e29b-41d4-a716-446655440000', ARRAY['Claude', '세미나', '활용법']);

-- Sample announcements
INSERT INTO announcements (id, title, content, category, priority, is_pinned, author_id, tags) VALUES
('880e8400-e29b-41d4-a716-446655440001', '2024년 2월 AI 학습동아리 정기모임 안내', 
'2월 정기모임이 2월 25일(일) 오후 5시에 진행됩니다. 이번 모임에서는 최신 AI 트렌드에 대해 공유하고 토론하는 시간을 가질 예정입니다. 많은 참여 부탁드립니다.',
'meeting', 'high', true, '550e8400-e29b-41d4-a716-446655440000',
ARRAY['정기모임', '참석안내', '필수']),

('880e8400-e29b-41d4-a716-446655440002', 'ChatGPT 고급 활용법 워크샵 신청 안내', 
'2월 15일 진행될 ChatGPT 고급 활용법 워크샵 참가자를 모집합니다. 선착순 20명으로 제한되니 서둘러 신청해주세요.',
'event', 'medium', true, '550e8400-e29b-41d4-a716-446655440000',
ARRAY['워크샵', '신청', 'ChatGPT']),

('880e8400-e29b-41d4-a716-446655440003', '동아리 운영 규칙 개정 안내', 
'동아리 운영의 효율성을 높이기 위해 일부 규칙을 개정하였습니다. 변경된 내용을 확인하여 주시기 바랍니다.',
'notice', 'high', false, '550e8400-e29b-41d4-a716-446655440000',
ARRAY['규칙', '개정', '필독']);

-- Sample community posts
INSERT INTO community_posts (id, title, content, category, author_id, is_pinned, tags) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'ChatGPT로 업무 보고서 작성 시간을 50% 단축했어요!', 
'최근에 ChatGPT를 활용해서 월간 업무 보고서를 작성해봤는데, 정말 효과적이었습니다. 기존에 하루 종일 걸리던 작업이 반나절로 줄어들었어요. 제가 사용한 프롬프트와 과정을 공유해드립니다...',
'tips', '550e8400-e29b-41d4-a716-446655440000', true,
ARRAY['ChatGPT', '업무효율', '보고서', '프롬프트']),

('990e8400-e29b-41d4-a716-446655440002', 'Claude와 ChatGPT 비교 사용 후기', 
'두 달간 Claude와 ChatGPT를 번갈아 사용해본 결과를 정리해봤습니다. 각각의 장단점과 어떤 업무에 더 적합한지 경험을 바탕으로 공유드려요.',
'review', '550e8400-e29b-41d4-a716-446655440000', false,
ARRAY['Claude', 'ChatGPT', '비교', '후기']),

('990e8400-e29b-41d4-a716-446655440003', 'GitHub Copilot 설정에서 막히는 분들 도와드려요', 
'개발 업무에 GitHub Copilot을 도입하려고 하는데 초기 설정에서 막히는 분들이 많은 것 같아요. 제가 성공적으로 설정한 방법을 단계별로 설명드리겠습니다.',
'help', '550e8400-e29b-41d4-a716-446655440000', false,
ARRAY['GitHub Copilot', '설정', '개발', '도움']);

-- Note: Comments, likes, and other relational data would be inserted after users are created
-- For now, we'll just set up the structure. The actual data will be populated when users interact with the system.