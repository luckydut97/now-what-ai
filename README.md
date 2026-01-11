## Now What?

필터(인원·구성·연령·분위기)만 고르면 AI가 즉석에서 액티비티 5개를 추천해 주는 Next.js 실험 프로젝트입니다. UI는 App Router + Tailwind 기반 단일 페이지이며, 추천 로직은 OpenAI GPT-4o-mini를 호출하는 서버 API로 옮겼습니다.

## 환경 설정

1. 의존성 설치

   ```bash
   npm install
   ```

2. OpenAI API 키를 `.env.local`에 설정

   ```bash
   OPENAI_API_KEY=sk-xxxx
   ```

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 실시간으로 필터를 조정하고 추천을 받을 수 있습니다.

## 구조 요약

- `app/page.tsx`: 페이지 전체와 필터 UI. 필터가 바뀌면 `useRecommendations` 훅에 알려서 상태를 초기화합니다.
- `app/features/recommendations/hooks/useRecommendations.ts`: 추천 로딩/상태 문구/에러 메시지를 관리하고 `/api/recommend`를 호출합니다.
- `app/api/recommend/route.ts`: OpenAI Responses API로 프롬프트를 전송하고, `zod` 스키마로 AI 응답(JSON)을 검증한 뒤 프론트에 반환합니다.

필요하면 `app/api/recommend/route.ts`에서 모델 이름, 프롬프트, 응답 스키마를 수정해 다른 LLM 또는 추가 필드를 실험할 수 있습니다.
