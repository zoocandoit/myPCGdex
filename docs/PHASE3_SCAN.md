# Phase 3: Scan & Vision Analysis Pipeline

## 개요

이 문서는 myPCGdex의 카드 스캔 및 Vision AI 분석 파이프라인 설정 방법을 설명합니다.

---

## Supabase Storage 설정

### 1. 버킷 생성 (Dashboard)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → **Storage** 이동
3. **New bucket** 클릭
4. 설정:
   - **Name**: `card-uploads`
   - **Public bucket**: OFF (비공개)
   - **File size limit**: 10MB
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/heic`

### 2. RLS 정책 적용

버킷 생성 후 SQL Editor에서 실행:

```bash
# 적용 파일
supabase/migrations/20250202000004_create_storage_bucket.sql
```

또는 Dashboard의 SQL Editor에서 해당 파일 내용을 직접 실행.

### 3. RLS 정책 설명

| 정책 | 설명 |
|------|------|
| INSERT | 사용자는 자신의 폴더(`{user_id}/`)에만 업로드 가능 |
| SELECT | 사용자는 자신의 파일만 조회/다운로드 가능 |
| UPDATE | 사용자는 자신의 파일만 수정(교체) 가능 |
| DELETE | 사용자는 자신의 파일만 삭제 가능 |

---

## 환경변수 설정

`.env.local`에 다음 중 하나 이상 추가:

```env
# OpenAI (권장 - GPT-4o Vision 사용)
OPENAI_API_KEY=sk-your-openai-api-key

# 또는 Anthropic (Claude Sonnet 4 사용)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

**참고**: 두 키가 모두 있으면 OpenAI를 우선 사용합니다.

---

## 스캔 플로우

### 1. 카메라 촬영 모드

```
사용자 → 카메라 촬영 → 미리보기 → [다시찍기 | 분석]
                                     ↓
                              Supabase Storage 업로드
                                     ↓
                              Signed URL 생성
                                     ↓
                              Vision API 호출
                                     ↓
                              결과 표시
```

### 2. 파일 업로드 모드

```
사용자 → 파일 선택 → 미리보기 → [취소 | 분석]
                                  ↓
                           (동일한 플로우)
```

---

## API 엔드포인트

### POST /api/vision/analyze

Vision AI를 통해 카드 이미지를 분석합니다.

**Request:**

```json
{
  "imageUrl": "https://...supabase.co/storage/v1/object/sign/card-uploads/..."
}
```

**Response (성공):**

```json
{
  "pokemon_name": "Pikachu",
  "card_number": "025/165",
  "set_id": "SV2a",
  "language": "en"
}
```

**Response (실패):**

```json
{
  "error": "Failed to analyze card after multiple attempts"
}
```

**인증**: 필수 (Supabase Auth 세션)

---

## 파일 구조

```
src/
├── app/
│   ├── (protected)/
│   │   └── scan/
│   │       ├── page.tsx              # 스캔 페이지
│   │       ├── webcam-scanner.tsx    # 카메라 촬영 컴포넌트
│   │       └── file-upload-scanner.tsx # 파일 업로드 컴포넌트
│   └── api/
│       └── vision/
│           └── analyze/
│               └── route.ts          # Vision API 라우트
├── lib/
│   ├── actions/
│   │   └── storage.ts                # Storage 업로드/삭제 액션
│   └── types/
│       └── vision.ts                 # Vision 관련 타입/스키마

supabase/
└── migrations/
    └── 20250202000004_create_storage_bucket.sql
```

---

## Vision 프롬프트 전략

### 핵심 규칙

1. **JSON만 반환**: 다른 텍스트 없이 순수 JSON만 반환하도록 강제
2. **card_number 우선순위**: 카드 하단의 "025/165" 형식 번호를 최우선 추출
3. **언어 감지**: 카드 텍스트 기반으로 언어 자동 감지

### 프롬프트 (요약)

```
You are a Pokemon card analyzer. Analyze this Pokemon card image.

IMPORTANT RULES:
1. Return ONLY valid JSON, no other text
2. For card_number, look at the BOTTOM of the card for numbers like "025/165"
3. For set_id, look for set symbols or codes (e.g., "SV2a")
4. Detect the language from the card text

Required JSON format:
{
  "pokemon_name": "string",
  "card_number": "string (e.g., '025/165')",
  "set_id": "string or null",
  "language": "en" | "ja" | "ko" | "zh" | "other"
}
```

---

## 검증 방법

### 1. Storage 버킷 확인

Supabase Dashboard → Storage → `card-uploads` 버킷 존재 확인

### 2. RLS 정책 확인

```sql
-- storage.objects 테이블의 정책 확인
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### 3. 업로드 테스트

1. `/scan` 페이지 접속 (로그인 필요)
2. 카메라 또는 파일 업로드 탭 선택
3. 이미지 촬영/선택 후 **Analyze** 클릭
4. Storage → `card-uploads/{user_id}/` 폴더에 파일 생성 확인

### 4. Vision API 테스트

```bash
# curl로 직접 테스트 (인증 필요하므로 브라우저에서 테스트 권장)
curl -X POST http://localhost:3000/api/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "YOUR_SIGNED_URL"}'
```

---

## 보안 고려사항

1. **서버 전용 API 키**: Vision API 키는 서버에서만 사용 (클라이언트 노출 금지)
2. **Signed URL**: Storage 파일은 제한된 시간(1시간) 동안만 접근 가능
3. **RLS**: 사용자는 자신의 파일에만 접근 가능
4. **파일 검증**: MIME type 및 파일 크기 검증

---

## 트러블슈팅

### "No Vision API key configured"

`.env.local`에 `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` 추가 후 서버 재시작

### "Upload failed" 또는 RLS 에러

1. Storage 버킷이 생성되었는지 확인
2. RLS 정책이 적용되었는지 확인
3. 사용자가 로그인되었는지 확인

### "Failed to analyze card after multiple attempts"

1. API 키가 유효한지 확인
2. 이미지가 선명한지 확인
3. 실제 포켓몬 카드 이미지인지 확인

---

## 다음 단계 (Phase 5)

- Phase 5: 스캔 결과를 DB에 저장하고 컬렉션 관리 기능 구현

---

# Phase 4: Card Search & Matching

## 개요

Vision AI 분석 결과를 바탕으로 Pokemon TCG API에서 실제 카드 정보를 검색하고 매칭하는 기능입니다.

---

## Pokemon TCG API

### API 정보

- **Base URL**: `https://api.pokemontcg.io/v2`
- **인증**: 선택사항 (API 키 사용 시 rate limit 증가)
- **문서**: https://docs.pokemontcg.io/

### 환경변수 (선택)

```env
# Pokemon TCG API 키 (rate limit 증가용)
POKEMON_TCG_API_KEY=your_api_key
```

---

## 파일 구조

```
src/
├── app/
│   ├── (protected)/
│   │   └── scan/
│   │       └── result-form.tsx       # 결과 수정/검색 UI
│   └── api/
│       └── cards/
│           └── search/
│               └── route.ts          # 카드 검색 API
├── lib/
│   └── tcg/
│       ├── types.ts                  # TCG API 타입 정의
│       └── client.ts                 # TCG API 클라이언트
```

---

## 검색 API

### POST /api/cards/search

Pokemon TCG API를 통해 카드를 검색합니다.

**Request:**

```json
{
  "name": "Pikachu",
  "number": "025",
  "setId": "sv2a"
}
```

**Response:**

```json
{
  "cards": [
    {
      "id": "sv2a-25",
      "name": "Pikachu",
      "number": "25",
      "set": {
        "id": "sv2a",
        "name": "Pokemon Card 151"
      },
      "images": {
        "small": "https://...",
        "large": "https://..."
      },
      "tcgplayer": {
        "url": "https://...",
        "prices": { ... }
      }
    }
  ],
  "totalCount": 1
}
```

---

## 검색 로직

1. **name + number 조합**: 가장 정확한 매칭
   - 쿼리: `name:"Pikachu*" number:25`

2. **name만**: number 매칭 실패 시 폴백
   - 쿼리: `name:"Pikachu*"`

3. **결과 정렬**: 최신 세트 우선 (`-set.releaseDate`)

---

## UI 플로우

```
Vision API 결과
    ↓
┌──────────────────────────┐
│ AI Detection Result      │
│ ┌──────────────────────┐ │
│ │ Pokemon: [Pikachu  ] │ │  ← 수정 가능
│ │ Number:  [025/165  ] │ │  ← 수정 가능
│ │ Set ID:  [sv2a     ] │ │  ← 수정 가능 (옵션)
│ └──────────────────────┘ │
│ [    Find Card    ]      │  ← 검색 버튼
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ Found 5 cards            │
│ ┌─────┐ ┌─────┐ ┌─────┐ │
│ │     │ │     │ │     │ │  ← 카드 이미지 그리드
│ │ ✓  │ │     │ │     │ │  ← 선택 표시
│ └─────┘ └─────┘ └─────┘ │
└──────────────────────────┘
    ↓
┌──────────────────────────┐
│ ✓ Selected Card          │
│ ┌───┐                    │
│ │   │ Pikachu            │
│ │   │ Pokemon Card 151   │
│ │   │ #25 · Common       │
│ └───┘ Market: $2.50      │
└──────────────────────────┘
```

---

## 다음 단계 (Phase 5)

- 선택한 카드를 컬렉션에 저장
- 컬렉션 관리 UI (목록, 삭제, 수량 조절)
- 컬렉션 통계 (총 카드 수, 가치 합계)
