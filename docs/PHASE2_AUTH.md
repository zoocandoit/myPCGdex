# Phase 2: Supabase Auth & DB Schema

## 개요

이 문서는 myPCGdex의 인증 시스템과 데이터베이스 스키마 설정 방법을 설명합니다.

---

## SQL 마이그레이션 적용 방법

### 1. Supabase Dashboard에서 직접 실행

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → **SQL Editor** 이동
3. 아래 순서대로 SQL 파일 내용을 실행:

```bash
# 적용 순서
1. supabase/migrations/20250202000001_create_profiles_table.sql
2. supabase/migrations/20250202000002_create_profile_trigger.sql
```

### 2. Supabase CLI 사용 (권장)

```bash
# Supabase CLI 설치
npm install -g supabase

# 프로젝트 연결
supabase login
supabase link --project-ref <your-project-ref>

# 마이그레이션 적용
supabase db push
```

---

## 데이터베이스 스키마

### profiles 테이블

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | auth.users.id 참조, CASCADE 삭제 |
| email | TEXT | 사용자 이메일 |
| created_at | TIMESTAMPTZ | 생성 시간 |
| updated_at | TIMESTAMPTZ | 수정 시간 |

### RLS 정책

- **SELECT**: 본인 row만 조회 가능 (`auth.uid() = id`)
- **UPDATE**: 본인 row만 수정 가능 (`auth.uid() = id`)
- **INSERT**: 트리거에서만 생성 (직접 insert 불가)
- **DELETE**: CASCADE로 auth.users 삭제 시 자동 삭제

### 자동 프로필 생성 트리거

`auth.users`에 새 사용자가 생성되면 `handle_new_user()` 함수가 실행되어
`profiles` 테이블에 자동으로 row가 생성됩니다.

---

## 인증 플로우

### 보호된 라우트 (Protected Routes)

다음 경로는 로그인 필수:
- `/scan` - 카드 스캔
- `/collection` - 컬렉션 관리
- `/profile` - 프로필 설정

### 로그인 전 시나리오

1. 사용자가 `/scan` 접속 시도
2. Middleware에서 인증 상태 확인
3. 미인증 시 `/login?redirectTo=/scan`으로 리다이렉트
4. 로그인 성공 후 원래 요청 경로(`/scan`)로 이동

### 로그인 후 시나리오

1. 사용자가 `/login` 또는 `/signup`에서 인증 완료
2. 기본적으로 `/scan`으로 리다이렉트
3. `redirectTo` 파라미터가 있으면 해당 경로로 이동

### 로그아웃 시나리오

1. `/profile` 페이지에서 로그아웃 버튼 클릭
2. Supabase 세션 종료
3. 홈페이지(`/`)로 리다이렉트

---

## Google OAuth 설정 (선택사항)

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. OAuth 2.0 클라이언트 ID 생성
3. 승인된 리디렉션 URI 추가:
   - `https://<project-ref>.supabase.co/auth/v1/callback`

### 2. Supabase Dashboard 설정

1. **Authentication** → **Providers** → **Google**
2. Client ID와 Client Secret 입력
3. 저장

### 3. 환경변수 설정

```env
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 파일 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx        # 로그인 페이지
│   │   │   └── login-form.tsx  # 로그인 폼 컴포넌트
│   │   └── signup/
│   │       ├── page.tsx        # 회원가입 페이지
│   │       └── signup-form.tsx # 회원가입 폼 컴포넌트
│   ├── (protected)/
│   │   ├── layout.tsx          # 인증 필수 레이아웃
│   │   ├── scan/
│   │   ├── collection/
│   │   └── profile/
│   │       ├── page.tsx        # 프로필 페이지
│   │       └── logout-button.tsx
│   └── auth/
│       └── callback/
│           └── route.ts        # OAuth 콜백 처리
├── lib/
│   ├── actions/
│   │   └── auth.ts             # 인증 서버 액션
│   └── supabase/
│       ├── client.ts           # 브라우저 클라이언트
│       ├── server.ts           # 서버 클라이언트
│       └── middleware.ts       # 세션 관리
└── middleware.ts               # Next.js 미들웨어

supabase/
└── migrations/
    ├── 20250202000001_create_profiles_table.sql
    └── 20250202000002_create_profile_trigger.sql
```

---

## 환경변수

```env
# 필수
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OAuth용 (선택)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false
```

---

## 보안 고려사항

1. **JWT 검증**: `getUser()` 사용 (서버에서 토큰 검증)
2. **RLS 적용**: 모든 테이블에 Row Level Security 활성화
3. **CSRF 방지**: Supabase SSR의 쿠키 기반 인증 사용
4. **입력 검증**: Zod 스키마로 이메일/비밀번호 검증

---

## 다음 단계 (Phase 3)

- 카드 이미지 업로드 기능 (Supabase Storage)
- Vision AI 연동 (카드 정보 추출)
- 카드 마스터 테이블 스키마 설계
