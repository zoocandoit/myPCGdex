# myPCGdex — 프로젝트 문서

> **개인용 포켓몬 TCG 카드 관리 애플리케이션**  
> Vision AI 기반 카드 스캔, 컬렉션 관리, 거래 추적, PnL 분석을 제공하는 모바일 우선 웹앱

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [핵심 기능](#4-핵심-기능)
5. [데이터 모델](#5-데이터-모델)
6. [데이터베이스 스키마](#6-데이터베이스-스키마)
7. [API 라우트](#7-api-라우트)
8. [서버 액션](#8-서버-액션)
9. [인증 & 라우트 보호](#9-인증--라우트-보호)
10. [국제화 (i18n)](#10-국제화-i18n)
11. [PnL 계산 로직](#11-pnl-계산-로직)
12. [Vision AI 파이프라인](#12-vision-ai-파이프라인)
13. [상태 관리](#13-상태-관리)
14. [스타일링](#14-스타일링)
15. [테스트](#15-테스트)
16. [환경 변수](#16-환경-변수)
17. [개발 가이드](#17-개발-가이드)

---

## 1. 프로젝트 개요

myPCGdex는 포켓몬 카드 거래를 전문으로 하는 사람을 위한 **개인 포트폴리오 & 거래 관리 도구**다.

### 핵심 목표

- 카드 이미지를 찍으면 AI가 자동 인식 (Vision AI)
- 컬렉션 전체를 한 곳에서 관리 (등급 카드 포함)
- 구매 후보 → 구매 → 리스팅 → 판매 전 과정 추적
- 수수료까지 반영한 정확한 수익/손실(PnL) 계산

### 비목표

- 공개 마켓플레이스 기능 (판매 플랫폼이 아님)
- 소셜/커뮤니티 기능
- 실시간 경매/입찰

---

## 2. 기술 스택

### Frontend

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| 프레임워크 | Next.js 16.1.6 (App Router) |
| 언어 | TypeScript 5 |
| React | 19.2.3 |
| UI 컴포넌트 | shadcn/ui (Radix UI 1.4.3 기반) |
| CSS | Tailwind CSS 4 |
| 아이콘 | lucide-react 0.563.0 |
| 테마 | next-themes 0.4.6 |
| Toast | sonner 2.0.7 |

### 상태 관리 & 데이터

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| 서버 상태 | @tanstack/react-query 5.90.20 |
| 데이터 검증 | zod 4.3.6 |

### 백엔드 & 인프라

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| BaaS | Supabase (Postgres + Auth + Storage + RLS) |
| Supabase SDK | @supabase/supabase-js 2.93.3, @supabase/ssr 0.8.0 |

### 외부 서비스

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| Vision AI | OpenAI GPT-4o |
| 카드 데이터 | Pokemon TCG API |
| OCR (보조) | tesseract.js 5.1.1 |

### 이미지 처리

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| HEIC 변환 | heic2any 0.0.4 |
| 웹캠 캡처 | react-webcam 7.2.0 |

### i18n

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| 다국어 | next-intl 4.8.2 |
| 지원 언어 | 한국어(ko), English(en), 日本語(ja) |

### 개발 도구

| 항목 | 라이브러리 / 버전 |
|------|-----------------|
| 테스트 | vitest 4.0.18 |
| 린트 | eslint 9 + eslint-config-next |

---

## 3. 프로젝트 구조

```
myPCGdex/
├── src/
│   ├── app/
│   │   ├── (auth)/                   # 비인증 라우트
│   │   │   ├── login/
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── page.tsx
│   │   │   └── signup/
│   │   │       ├── signup-form.tsx
│   │   │       └── page.tsx
│   │   ├── (protected)/              # 인증 필요 라우트
│   │   │   ├── collection/
│   │   │   │   ├── collection-list.tsx
│   │   │   │   ├── pending-list.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── card-detail-view.tsx
│   │   │   │       ├── cost-basis-panel.tsx
│   │   │   │       ├── listing-history-panel.tsx
│   │   │   │       ├── price-chart.tsx
│   │   │   │       └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard-stats.tsx
│   │   │   │   ├── recent-activity.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── deals/
│   │   │   │   ├── add-deal-button.tsx
│   │   │   │   ├── deal-list.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── listings/
│   │   │   │   ├── add-listing-button.tsx
│   │   │   │   ├── listing-list.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── sales/
│   │   │   │   ├── pnl-summary-cards.tsx
│   │   │   │   ├── sale-table.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── scan/
│   │   │   │   ├── confirm-save-form.tsx
│   │   │   │   ├── dual-image-scanner.tsx
│   │   │   │   ├── file-upload-scanner.tsx
│   │   │   │   ├── manual-entry-form.tsx
│   │   │   │   ├── result-form.tsx
│   │   │   │   ├── save-to-collection-dialog.tsx
│   │   │   │   ├── scan-tabs.tsx
│   │   │   │   ├── webcam-scanner.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── profile/
│   │   │   │   ├── language-selector.tsx
│   │   │   │   ├── logout-button.tsx
│   │   │   │   ├── vision-usage-display.tsx
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx            # 인증 가드
│   │   ├── api/
│   │   │   ├── vision/analyze/
│   │   │   │   └── route.ts          # GPT-4o 카드 인식
│   │   │   ├── cards/search/
│   │   │   │   └── route.ts          # Pokemon TCG API 검색
│   │   │   └── auth/callback/
│   │   │       └── route.ts          # OAuth 콜백
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   └── page.tsx                  # 랜딩 페이지
│   ├── components/
│   │   ├── layout/
│   │   │   └── bottom-nav.tsx        # 하단 네비게이션
│   │   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── card-image.tsx
│   │   ├── language-switcher.tsx
│   │   └── sonner.tsx
│   ├── lib/
│   │   ├── actions/                  # Next.js Server Actions
│   │   │   ├── auth.ts
│   │   │   ├── collection.ts
│   │   │   ├── deals.ts
│   │   │   ├── listings.ts
│   │   │   ├── locale.ts
│   │   │   ├── pending.ts
│   │   │   ├── sales.ts
│   │   │   ├── snapshots.ts
│   │   │   ├── storage.ts
│   │   │   └── vision-usage.ts
│   │   ├── types/
│   │   │   ├── collection.ts
│   │   │   ├── pending.ts
│   │   │   ├── trade.ts
│   │   │   └── vision.ts
│   │   ├── supabase/
│   │   │   ├── client.ts             # 클라이언트 Supabase 인스턴스
│   │   │   ├── middleware.ts
│   │   │   └── server.ts             # 서버(SSR) Supabase 인스턴스
│   │   ├── tcg/
│   │   │   ├── client.ts             # Pokemon TCG API 클라이언트
│   │   │   ├── hooks.ts
│   │   │   ├── normalize.ts          # 카드 번호 정규화
│   │   │   ├── types.ts
│   │   │   └── __tests__/
│   │   │       └── normalize.test.ts
│   │   ├── vision/
│   │   │   ├── validators.ts
│   │   │   └── __tests__/
│   │   │       └── validators.test.ts
│   │   ├── image/
│   │   │   └── preprocess.ts         # HEIC 변환, 리사이즈, EXIF 처리
│   │   ├── ocr/
│   │   │   └── card-ocr.ts
│   │   ├── utils/
│   │   │   ├── pnl.ts                # 수익/손실 계산
│   │   │   └── redirect.ts
│   │   ├── env.ts                    # 환경변수 검증
│   │   └── utils.ts
│   ├── i18n/
│   │   ├── config.ts
│   │   └── request.ts
│   ├── providers/
│   │   ├── query-provider.tsx        # React Query 설정
│   │   └── theme-provider.tsx
│   └── types/
│       └── heic2any.d.ts
├── supabase/
│   └── migrations/                   # DB 마이그레이션 파일
├── messages/
│   ├── ko.json                       # 한국어 번역
│   ├── en.json                       # 영어 번역
│   └── ja.json                       # 일본어 번역
├── public/                           # 정적 파일
├── docs/
│   └── PROJECT.md                    # 이 문서
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── components.json                   # shadcn/ui 설정
└── package.json
```

---

## 4. 핵심 기능

### 4.1 카드 스캔 & 인식 (`/scan`)

사용자가 카드 이미지를 제공하면 GPT-4o가 자동으로 카드 정보를 추출한다.

**입력 방법 3가지:**
| 방법 | 컴포넌트 | 설명 |
|------|---------|------|
| 웹캠 촬영 | `webcam-scanner.tsx` | 모바일/데스크톱 실시간 캡처 |
| 파일 업로드 | `file-upload-scanner.tsx` | JPEG, PNG, WebP, HEIC 지원 |
| 양면 스캔 | `dual-image-scanner.tsx` | 앞/뒤 동시 분석 |
| 수동 입력 | `manual-entry-form.tsx` | 직접 입력 fallback |

**이미지 처리 파이프라인** (`src/lib/image/preprocess.ts`):
1. HEIC → JPEG 변환 (`heic2any`)
2. EXIF 방향 정보 보정
3. 최대 1400px로 리사이즈
4. 85% 품질로 압축
5. Supabase Storage에 업로드
6. Vision API에 signed URL 전달

**스캔 결과:**
- `pokemon_name`: 포켓몬 이름
- `card_number`: 카드 번호 (예: `025/165`)
- `set_id`: 세트 코드 (예: `sv3pt5`)
- `language`: `ko` / `ja` / `en`

### 4.2 컬렉션 관리 (`/collection`)

카드 인벤토리 전체를 관리한다.

**주요 기능:**
- 카드 추가 (Vision 스캔 또는 수동 입력)
- 상태별 필터링: 세트, 언어, 상태, 등급 여부
- 정렬: 날짜, 가격, 이름
- 검색: 포켓몬 이름, 카드 번호
- 카드 상세 (`/collection/[id]`): 이미지, 원가, 리스팅 이력, 가격 차트

**등급 카드 지원:**
- `grading_company`: PSA, BGS, CGC 등
- `grade`: 등급 점수
- `cert_number`: 인증 번호
- `external_uid`: 외부 추적 ID

**TCG API 연동:**
- 카드 번호로 공식 이미지 자동 매칭
- 시장가(`market_price`) 자동 업데이트

### 4.3 딜(구매 후보) 관리 (`/deals`)

카드를 구매하기 전 단계의 후보를 추적한다.

**상태 흐름:**
```
candidate → bought → (컬렉션에 추가)
         └→ canceled
```

**추적 항목:**
- 플랫폼: 당근마켓, 번개장터, eBay, 오프라인, 지인, 기타
- 요청 가격 vs 협상 가격
- 수수료 (배송비, 세금 등)
- 스크린샷 첨부
- 판매 링크

### 4.4 리스팅 관리 (`/listings`)

카드 판매 게시물을 관리한다.

**상태 흐름:**
```
draft → active → ended → sold
              └→ canceled
```

**지원 플랫폼:** eBay, 번개장터, 당근마켓, 기타  
**지원 통화:** KRW, USD, JPY  
**수량 관리:** 동일 카드 여러 장 리스팅 지원

### 4.5 판매 & PnL 추적 (`/sales`)

완료된 판매를 기록하고 수익을 계산한다.

**자동 계산 항목:**
- 순수익 (`net_payout`)
- 원가 (`cost_basis`)
- 실현 PnL 및 마진율
- 기간별 집계 요약

**eBay 수수료 자동 계산** (2024 기준):
- Final Value Fee: 첫 $7,500의 13.25% + 초과분 2.35%
- Fixed Fee: $0.30/건
- International Fee: 1.65% (해외 구매자)

### 4.6 대시보드 (`/dashboard`)

포트폴리오 전체 현황을 한눈에 확인한다.

**통계 카드:**
- 총 카드 수
- 총 포트폴리오 가치 (시장가 기준)
- 총 원가
- 미실현 PnL

**최근 활동:**
- 신규 구매 후보
- 활성 리스팅
- 최근 판매 건

### 4.7 프로필 (`/profile`)

- 언어 설정 (한/영/일)
- Vision API 사용량 확인
- 로그아웃

---

## 5. 데이터 모델

### CollectionCard (`src/lib/types/collection.ts`)

```typescript
interface CollectionCard {
  id: string
  user_id: string
  pokemon_name: string
  card_number: string
  set_id: string | null
  language: 'ko' | 'ja' | 'en'
  rarity: string | null
  tcg_card_id: string | null
  set_name: string | null
  tcg_image_url: string | null
  market_price: number | null
  artist: string | null
  purchase_price: number | null
  condition: 'mint' | 'near_mint' | 'lightly_played' | 'moderately_played' | 'heavily_played'
  quantity: number
  notes: string | null
  acquisition_source: string | null
  front_image_path: string | null
  back_image_path: string | null
  is_graded: boolean
  grading_company: string | null
  grade: string | null
  cert_number: string | null
  slab_notes: string | null
  external_uid: string | null
  input_method: 'vision' | 'manual'
  collected_at: string
  created_at: string
  updated_at: string
}
```

### Acquisition (`src/lib/types/trade.ts`)

```typescript
interface Acquisition {
  id: string
  user_id: string
  collection_id: string | null          // 컬렉션에 추가되면 연결
  card_name: string | null
  status: 'candidate' | 'bought' | 'canceled'
  source_platform: 'danggeun' | 'bunjang' | 'offline' | 'friend' | 'ebay' | 'other' | null
  source_url: string | null
  asking_price: number | null
  negotiated_price: number | null
  fees_cost: number
  notes: string | null
  screenshot_path: string | null
  created_at: string
  updated_at: string
}
```

### Listing (`src/lib/types/trade.ts`)

```typescript
interface Listing {
  id: string
  user_id: string
  collection_id: string
  status: 'draft' | 'active' | 'ended' | 'sold' | 'canceled'
  platform: 'ebay' | 'bunjang' | 'danggeun' | 'other'
  listing_url: string | null
  title: string | null
  listed_price: number
  currency: 'KRW' | 'USD' | 'JPY'
  quantity: number
  started_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}
```

### Sale (`src/lib/types/trade.ts`)

```typescript
interface Sale {
  id: string
  user_id: string
  listing_id: string
  sold_price: number
  shipping_charged: number           // 구매자에게 받은 배송비
  shipping_cost: number              // 실제 배송 비용
  platform_fee: number               // 플랫폼 수수료
  payment_fee: number                // 결제 수수료
  international_fee: number          // 해외 거래 수수료
  tax_withheld: number               // 원천징수 세금
  net_payout: number | null          // 자동 계산
  sold_at: string
  buyer_region: 'domestic' | 'international' | null
  created_at: string
}
```

### PriceSnapshot (`src/lib/types/trade.ts`)

```typescript
interface PriceSnapshot {
  id: string
  collection_id: string
  user_id: string
  market_price: number
  currency: 'KRW' | 'USD' | 'JPY'
  source: 'tcg_api' | 'ebay_comps' | 'manual'
  captured_at: string
}
```

### VisionResponse (`src/lib/types/vision.ts`)

```typescript
interface VisionResponse {
  pokemon_name: string
  card_number: string
  set_id?: string
  language: 'ko' | 'ja' | 'en'
}
```

---

## 6. 데이터베이스 스키마

마이그레이션 파일 위치: `supabase/migrations/`

| 테이블 | 마이그레이션 | 설명 |
|--------|------------|------|
| `profiles` | 20250202000001 | 사용자 프로필 |
| `vision_usage` | 20250205000002 | Vision API 사용량 추적 |
| `collections` | 20250205000003 | 카드 인벤토리 (핵심 테이블) |
| `pending_cards` | 20250205000004 | 처리 대기 카드 큐 |
| `acquisitions` | 20260309000002 | 구매 후보/딜 관리 |
| `listings` | 20260309000003 | 판매 리스팅 |
| `sales` | 20260309000004 | 완료된 판매 |
| `fee_rules` | 20260309000005 | 플랫폼 수수료 규칙 |
| `price_snapshots` | 20260309000006 | 가격 이력 |

**모든 테이블에 RLS(Row Level Security) 적용** — 사용자는 자신의 데이터만 접근 가능

### collections 테이블 주요 인덱스
- `user_id`
- `pokemon_name`
- `set_id`
- `collected_at`

### fee_rules 테이블
- eBay 2024 수수료 규칙 시드 데이터 포함
- 날짜 기반 유효기간 지원
- 수수료 타입: `final_value`, `payment`, `international`, `fixed`

### Supabase Storage
- RLS: 사용자 본인 파일만 접근
- 허용 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/heic`
- 파일 크기 제한: 10MB

---

## 7. API 라우트

### POST `/api/vision/analyze`

카드 이미지를 GPT-4o로 분석하여 카드 정보를 추출한다.

**인증:** 필요 (Supabase Auth)

**요청:**
```json
{ "imageUrl": "https://[project].supabase.co/storage/v1/object/sign/..." }
```

**응답 (성공):**
```json
{
  "pokemon_name": "피카츄",
  "card_number": "025/165",
  "set_id": "sv3pt5",
  "language": "ko"
}
```

**에러 코드:**
| 코드 | 원인 |
|------|------|
| `invalid_api_key` | OpenAI API 키 없음/잘못됨 |
| `quota_exceeded` | 크레딧 소진 |
| `rate_limited` | 요청 한도 초과 |
| `analysis_failed` | 재시도 후에도 실패 |

**보안:**
- URL 화이트리스트: Supabase Storage signed URL만 허용
- 서버 사이드에서만 OpenAI API 키 사용
- 재시도 로직: 최대 3회

---

### POST `/api/cards/search`

Pokemon TCG API에서 카드를 검색한다.

**인증:** 필요 (Supabase Auth)

**요청:**
```json
{
  "name": "피카츄",
  "number": "025",
  "setId": "sv3pt5",
  "query": "name:Pikachu"
}
```

**검색 우선순위:**
1. 이름 + 번호 (완전 일치)
2. 이름만
3. 번호만
4. 자유 쿼리

**응답:**
```json
{
  "cards": [...],
  "totalCount": 12
}
```

---

### GET `/auth/callback`

OAuth 인증 후 세션을 교환하는 콜백 핸들러.

- Auth code를 Session으로 교환
- Open Redirect 방지 (safe redirect 유틸 사용)
- 완료 후 `/dashboard`로 리다이렉트

---

## 8. 서버 액션

모든 서버 액션은 `"use server"` 지시어를 사용하고, `{ success, data, error }` 형태를 반환한다.

### Collection Actions (`src/lib/actions/collection.ts`)

| 함수 | 설명 |
|------|------|
| `addCardManual(entry)` | 수동 입력으로 카드 추가 |
| `addCardVision(entry)` | Vision 스캔 결과로 카드 추가 |
| `getCardById(cardId)` | 단일 카드 조회 |
| `getCollection(options?)` | 목록 조회 (필터링, 검색, 정렬, 페이지네이션) |
| `updateCard(cardId, updates)` | 카드 정보 수정 |
| `deleteCard(cardId)` | 카드 삭제 |
| `getCollectionStats()` | 통계 조회 (총 카드 수, 가치, 고유 포켓몬 수) |

### Deal Actions (`src/lib/actions/deals.ts`)

| 함수 | 설명 |
|------|------|
| `createAcquisition(input)` | 딜 생성 |
| `getAcquisitions(options?)` | 목록 조회 (상태 필터 지원) |
| `getAcquisitionById(id)` | 단일 딜 조회 |
| `updateAcquisition(id, updates)` | 딜 정보 수정 |
| `deleteAcquisition(id)` | 딜 삭제 |
| `markAcquisitionBought(id)` | 구매 완료로 상태 전환 |

### Listing Actions (`src/lib/actions/listings.ts`)

| 함수 | 설명 |
|------|------|
| `createListing(input)` | 리스팅 생성 |
| `getListings(options?)` | 목록 조회 (상태, 플랫폼 필터 지원) |
| `getListingById(id)` | 단일 리스팅 조회 |
| `updateListing(id, updates)` | 리스팅 수정 |
| `deleteListing(id)` | 리스팅 삭제 |
| `markListingActive(id)` | 활성 상태로 전환 |

### Sale Actions (`src/lib/actions/sales.ts`)

| 함수 | 설명 |
|------|------|
| `createSale(input)` | 판매 기록 생성 (net_payout 자동 계산) |
| `getSales(options?)` | 판매 목록 조회 (날짜 범위 필터 지원) |
| `getPnLSummary(options?)` | PnL 집계 요약 |
| `getEbayFeeRules()` | DB에서 활성 eBay 수수료 규칙 조회 |

### 기타 Actions

| 파일 | 함수 | 설명 |
|------|------|------|
| `storage.ts` | `uploadImage`, `deleteImage` | Supabase Storage 이미지 관리 |
| `vision-usage.ts` | `incrementUsage`, `getUsage` | Vision API 사용량 추적 |
| `snapshots.ts` | `captureSnapshot`, `getSnapshots` | 가격 스냅샷 관리 |
| `locale.ts` | `setLocale`, `getLocale` | 언어 설정 저장 |

---

## 9. 인증 & 라우트 보호

### 인증 방식

Supabase Auth 사용. JWT를 서버에서 직접 검증한다.

```typescript
// src/app/(protected)/layout.tsx
const { data: { user } } = await supabase.auth.getUser()
// getSession()이 아닌 getUser() 사용 → 서버에서 JWT 검증
if (!user) redirect('/login')
```

> `getSession()`은 쿠키만 확인하므로 보안에 취약. `getUser()`는 Supabase 서버에 검증 요청을 보내 안전하다.

### 라우트 맵

**공개 라우트:**
| 경로 | 설명 |
|------|------|
| `/` | 랜딩 페이지 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/auth/callback` | OAuth 콜백 |

**보호 라우트 (로그인 필요):**
| 경로 | 설명 |
|------|------|
| `/dashboard` | 포트폴리오 대시보드 |
| `/collection` | 컬렉션 목록 |
| `/collection/[id]` | 카드 상세 |
| `/deals` | 딜(구매 후보) 관리 |
| `/listings` | 리스팅 관리 |
| `/sales` | 판매 & PnL |
| `/scan` | 카드 스캔 |
| `/profile` | 프로필 & 설정 |

---

## 10. 국제화 (i18n)

### 지원 언어

| 코드 | 언어 | 기본값 |
|------|------|-------|
| `ko` | 한국어 | ✓ |
| `en` | English | |
| `ja` | 日本語 | |

### 구현

- 라이브러리: `next-intl` 4.8.2
- 언어 설정: 쿠키에 저장 (서버에서 읽음)
- 메시지 파일: `messages/ko.json`, `messages/en.json`, `messages/ja.json`
- 설정 파일: `src/i18n/config.ts`, `src/i18n/request.ts`

### 번역 키 구조

```json
{
  "nav": { "home": "홈", "scan": "스캔", "collection": "컬렉션", ... },
  "scan": { "title": "카드 스캔", ... },
  "collection": { ... },
  "condition": {
    "mint": "민트",
    "near_mint": "니어민트",
    "lightly_played": "라이틀리 플레이드",
    ...
  },
  "platform": {
    "danggeun": "당근마켓",
    "bunjang": "번개장터",
    "ebay": "eBay",
    ...
  }
}
```

---

## 11. PnL 계산 로직

(`src/lib/utils/pnl.ts`)

### 순수익 계산

```
net_payout = sold_price
           + shipping_charged
           - shipping_cost
           - platform_fee
           - payment_fee
           - international_fee
           - tax_withheld
```

### 원가 계산

```
cost_basis = purchase_price + fees_cost
  (fees_cost = 구매 수수료 + 등급 수수료 + 국내 배송비 등)
```

### 실현 PnL

```
realized_pnl  = net_payout - cost_basis
margin_pct    = (realized_pnl / cost_basis) × 100
```

### 미실현 PnL

```
unrealized_pnl     = market_price - cost_basis
unrealized_pnl_pct = (unrealized_pnl / cost_basis) × 100
```

### eBay 수수료 자동 계산 (2024)

```
gross_revenue = sold_price + shipping_charged

final_value_fee:
  gross_revenue ≤ $7,500  →  gross_revenue × 13.25%
  gross_revenue >  $7,500 →  ($7,500 × 13.25%) + (초과분 × 2.35%)

fixed_fee         = $0.30 / 건
international_fee = gross_revenue × 1.65%  (해외 구매자만)

total_fees = final_value_fee + fixed_fee + international_fee + shipping_cost

net_payout = gross_revenue - total_fees
```

수수료 규칙은 `fee_rules` 테이블에 저장되어 날짜 기반으로 관리된다.

---

## 12. Vision AI 파이프라인

### 흐름

```
사용자 이미지 촬영/업로드
        ↓
이미지 전처리 (HEIC 변환 → EXIF 보정 → 리사이즈 → 압축)
        ↓
Supabase Storage 업로드
        ↓
POST /api/vision/analyze (signed URL 전달)
        ↓
URL 화이트리스트 검증 (Supabase Storage만 허용)
        ↓
GPT-4o 이미지 분석 (재시도 최대 3회)
        ↓
JSON 응답 추출 및 Zod 스키마 검증
        ↓
pokemon_name, card_number, set_id, language 반환
```

### GPT-4o 프롬프트 전략

- JSON만 반환하도록 지시
- 카드 하단의 카드 번호 추출에 집중
- 언어 자동 감지 (한국어/일본어/영어만)
- 세트 코드 추론 시도

### 보안 고려사항

- OpenAI API 키는 서버에서만 사용 (클라이언트 노출 없음)
- URL 검증: Supabase Storage signed URL 패턴만 허용
- 사용량 추적: `vision_usage` 테이블로 rate limiting 지원

---

## 13. 상태 관리

### 아키텍처

- **서버 상태:** React Query (TanStack Query) — 캐시 staleTime 60초
- **테마:** next-themes (dark/light/system)
- **i18n:** next-intl (NextIntlClientProvider)
- **폼 상태:** 로컬 컴포넌트 state (useState)
- **전역 상태 관리자 없음** (Redux, Zustand 미사용)

### React Query 설정

```typescript
// src/providers/query-provider.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,         // 60초
      refetchOnWindowFocus: false,   // 포커스 시 재요청 없음
    },
  },
})
```

### 데이터 흐름

```
Server Components (페이지)
  → Server Actions (Supabase 쿼리)
  → React Query 캐시 (클라이언트)
  → UI 컴포넌트
```

---

## 14. 스타일링

### 스택

- **CSS 프레임워크:** Tailwind CSS 4 (`@tailwindcss/postcss`)
- **컴포넌트:** shadcn/ui (`src/components/ui/`)
- **유틸리티:**
  - `tailwind-merge`: 충돌 클래스 병합
  - `clsx`: 조건부 클래스
  - `class-variance-authority`: 컴포넌트 변형(variant) 정의
- **애니메이션:** `tw-animate-css`

### shadcn/ui 설정 (`components.json`)

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "ui": "@/components/ui" }
}
```

### 테마

- CSS 변수 기반 다크/라이트 모드
- 폰트: Geist Sans, Geist Mono
- 색상 토큰: `globals.css`의 `@theme` 블록에서 정의

---

## 15. 테스트

### 설정 (`vitest.config.ts`)

- 환경: Node
- 테스트 파일 패턴: `src/**/__tests__/**/*.test.ts`
- 경로 별칭: `@` → `./src`

### 테스트 범위

| 파일 | 커버리지 |
|------|---------|
| `src/lib/tcg/__tests__/normalize.test.ts` | 카드 번호 정규화 (48개 케이스) |
| `src/lib/vision/__tests__/validators.test.ts` | Vision 응답 검증 |

### 실행

```bash
npx vitest
npx vitest run   # CI 모드
```

---

## 16. 환경 변수

(`src/lib/env.ts`에서 Zod로 검증)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OpenAI (서버 전용)
OPENAI_API_KEY=

# Pokemon TCG API (선택)
POKEMON_TCG_API_KEY=
```

---

## 17. 개발 가이드

### 시작

```bash
npm install
npm run dev      # http://localhost:3000
```

### 빌드

```bash
npm run build
npm start
```

### DB 마이그레이션

```bash
supabase db push
supabase migration new [name]
```

### 새 기능 추가 체크리스트

1. `supabase/migrations/`에 마이그레이션 추가
2. `src/lib/types/`에 TypeScript 타입 추가
3. `src/lib/actions/`에 서버 액션 추가
4. `src/app/(protected)/[route]/`에 페이지/컴포넌트 추가
5. `messages/*.json`에 번역 키 추가
6. RLS 정책 확인

### 코드 컨벤션

- 서버 액션은 `{ success: boolean, data?, error? }` 반환
- 입력 검증은 Zod 스키마 사용
- 인증 확인은 항상 `supabase.auth.getUser()` 사용 (getSession 금지)
- 클라이언트 컴포넌트에는 `"use client"` 명시
- 경로 별칭 `@/` 사용 (상대 경로 지양)
