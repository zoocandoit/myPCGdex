# myPCGdex: Card Management & Profit Tracker (Pivot Plan)

> 작성일: 2026-03-09 | Phase: B (DB 확장 진행 중)

---

## 0) 목표 / 비목표

### 목표
- "내 카드" 중심으로 인벤토리(보유/등급/원가) 관리
- 매물(국내 매입 후보 / 내 판매 리스팅 / 판매완료) 관리
- 수익(실현/미실현), 회전율, 채널별 수수료를 자동 계산
- (선택) eBay 판매를 염두에 둔 수수료/배송/환율 포함 실수령 계산

### 비목표 (MVP 단계에서 제외)
- 당근/번개 자동 크롤링/모니터링 → "링크 수동 등록"으로 시작
- 완전한 거래 마켓플레이스(타인 판매자/구매자 매칭)

---

## 1) 현재 자산 (레포에서 이미 완성된 것)

- ✅ Supabase Auth + RLS (개인 데이터 보호)
- ✅ Scan + Vision API 분석 + TCG API 매칭 (카드 기본 정보 자동 인식)
- ✅ `collections` 테이블: 카드 기본정보 + 이미지 + `purchase_price` + `market_price` + 수량/상태 + 입력방식
- ✅ `pending_cards` 큐 테이블 (일일 제한/대기열 처리)
- ✅ collection 조회/통계 서버액션 (`getCollection`, `getCollectionStats`)

---

## 2) 피벗 후 핵심 도메인 (개념 모델)

| 도메인 | 설명 |
|--------|------|
| **Inventory** | 내가 가진 카드 1건(또는 묶음). 등급카드면 grading 메타 포함. 원가/추가비용 분리. |
| **Deal / Acquisition** | 어디서/얼마에/언제/어떤 상태로 들였는지. 매입 후보(링크)도 포함. |
| **Listing** | eBay/국내 플랫폼에 올린 판매 게시물 단위. 가격 변경 이력/상태 관리. |
| **Sale / Settlement** | 판매 완료 후 실제 실수령(Net) 계산. eBay 수수료 룰 반영. |
| **Price Snapshot** | 카드별 시세를 주기적으로 저장. 미실현 손익/포트폴리오 그래프 기반. |

---

## 3) DB 설계 (마이그레이션 계획)

> 원칙: 기존 `collections`는 최대한 유지하고, "거래/매물/정산" 테이블을 추가한다.

### 3.1 collections 확장 (graded 관련 컬럼 추가)

```sql
ALTER TABLE collections ADD COLUMN is_graded boolean DEFAULT false;
ALTER TABLE collections ADD COLUMN grading_company text;   -- PSA/BGS/CGC/BRG…
ALTER TABLE collections ADD COLUMN grade text;             -- "10", "9.5"
ALTER TABLE collections ADD COLUMN cert_number text;
ALTER TABLE collections ADD COLUMN slab_notes text;
ALTER TABLE collections ADD COLUMN external_uid text;      -- "psa:12345678"
-- UNIQUE INDEX (user_id, external_uid) WHERE external_uid IS NOT NULL
```

### 3.2 acquisitions (매입/매입후보)

```sql
CREATE TABLE public.acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'candidate',   -- candidate | bought | canceled
  source_platform text,                        -- danggeun | bunjang | offline | friend
  source_url text,
  asking_price numeric(10,2),
  negotiated_price numeric(10,2),
  fees_cost numeric(10,2),                     -- 택배비/수수료/그레이딩비 등
  notes text,
  screenshot_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3.3 listings (판매 리스팅)

```sql
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'draft',   -- draft | active | ended | sold | canceled
  platform text NOT NULL,                 -- ebay | bunjang | etc
  listing_url text,
  title text,
  listed_price numeric(10,2) NOT NULL,
  currency text DEFAULT 'KRW',            -- KRW | USD
  quantity integer DEFAULT 1,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3.4 sales (판매 정산)

```sql
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  sold_price numeric(10,2) NOT NULL,
  shipping_charged numeric(10,2) DEFAULT 0,   -- 구매자에게 받은 배송비
  shipping_cost numeric(10,2) DEFAULT 0,       -- 내가 실제 낸 배송비
  platform_fee numeric(10,2) DEFAULT 0,
  payment_fee numeric(10,2) DEFAULT 0,
  international_fee numeric(10,2) DEFAULT 0,
  tax_withheld numeric(10,2) DEFAULT 0,
  net_payout numeric(10,2),                    -- 계산 결과
  sold_at timestamptz NOT NULL DEFAULT now(),
  buyer_region text                            -- domestic | us | jp | etc
);
```

### 3.5 fee_rules (수수료 룰 테이블)

```sql
CREATE TABLE public.fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,                     -- ebay | bunjang
  category text DEFAULT 'trading_cards',
  rule_type text NOT NULL,                    -- final_value | payment | international | fixed
  rate numeric(6,4) DEFAULT 0,               -- 비율 (0.1325 = 13.25%)
  fixed_amount numeric(10,2) DEFAULT 0,       -- 건당 고정 금액
  currency text DEFAULT 'USD',
  valid_from date NOT NULL,
  valid_to date,
  notes text
);
```

### 3.6 price_snapshots (시세 스냅샷)

```sql
CREATE TABLE public.price_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_price numeric(10,2) NOT NULL,
  currency text DEFAULT 'KRW',
  source text DEFAULT 'manual',              -- tcg_api | ebay_comps | manual
  captured_at timestamptz DEFAULT now()
);
```

---

## 4) 화면 (IA) 설계: MVP 라우트

| 라우트 | 설명 |
|--------|------|
| `/dashboard` | 총 보유가치/원가/미실현손익, 최근 매입/판매/활성 리스팅 요약, 이번 달 수익 |
| `/inventory` | 기존 `/collection`을 Inventory로 재해석. 필터: 언어/세트/등급사/등급. |
| `/inventory/[id]` | 카드 상세: 원가 구성, 시세 그래프, 리스팅/판매 이력 |
| `/deals` | 매입 후보 링크 등록 + 상태 전환 (candidate → bought) |
| `/listings` | 판매 리스팅 목록 (활성/종료/판매완료). "판매완료 처리(정산 입력)" 버튼. |
| `/sales` | 판매 완료 목록. 채널별/월별 손익, 평균 마진, 회전일수. |

---

## 5) 계산 로직 (수익/손익) — MVP 정의

### 5.1 원가 (COGS)
```
purchase_price (또는 acquisitions.negotiated_price)
+ acquisitions.fees_cost (택배/그레이딩/관세 등)
= total_cost_basis
```

### 5.2 매출 (Revenue)
```
sold_price + shipping_charged (구매자에게 받은 배송비)
= gross_revenue
```

### 5.3 비용 (Fees)
```
platform_fee + payment_fee + international_fee + shipping_cost + tax_withheld
= total_fees
```

### 5.4 실현손익 (Realized PnL)
```
net_payout - total_cost_basis = realized_pnl
```

### 5.5 미실현손익 (Unrealized PnL)
```
latest_market_price - total_cost_basis = unrealized_pnl
```

---

## 6) eBay 수수료 계산기 (fee_rules 기반)

### MVP eBay 기본 룰 (2024 기준, trading_cards 카테고리)

| 항목 | 요율/금액 | 비고 |
|------|-----------|------|
| Final Value Fee | 13.25% | $7,500 이하 거래 |
| Final Value Fee (초과분) | 2.35% | $7,500 초과 부분 |
| 건당 고정 수수료 | $0.30 | 주문당 |
| International Fee | 1.65% | 미국 외 배송 시 |
| Payment Fee | 0% | Managed Payments 포함 |

### 계산 함수 시그니처 (유틸)
```typescript
calculateEbayPayout(params: {
  soldPrice: number      // USD
  shippingCharged: number
  shippingCost: number
  isInternational: boolean
  rules?: FeeRule[]      // DB에서 로드, 없으면 기본값 사용
}): {
  grossRevenue: number
  platformFee: number
  internationalFee: number
  fixedFee: number
  shippingNet: number
  netPayout: number
}
```

---

## 7) 개발 단계 (거시 로드맵)

| Phase | 내용 | 상태 |
|-------|------|------|
| A | MVP 목표/비목표 확정, IA 확정, 용어 정리 | ✅ 완료 |
| B | DB 확장 + RLS (migrations 추가, 인덱스) | 🚧 진행 중 |
| C | 서버 액션/타입 (deals/listings/sales + 손익 유틸) | ⬜ 대기 |
| D | UI 구현 (Dashboard, Deals, Listings, Sales) | ⬜ 대기 |
| E | 시세/정산 고도화 (price_snapshots 그래프, CSV) | ⬜ 대기 |
| F | 자동화 (eBay 연동, 알림) | ⬜ 대기 |

---

## 8) 개발 원칙

- DB → 액션 → UI 순서로 작은 단위로 진행
- 각 Phase마다 `docs/PHASEX_*.md` 스타일로 체크리스트 유지
- Supabase schema 변경 시: migrations 먼저 → 타입/액션 → 화면 순서
- RLS: 모든 신규 테이블에 `user_id = auth.uid()` 기본 적용
