# myPCGdex

Personal Pokémon Card Manager for scanning, tracking, and selling cards.

myPCGdex is a personal card management app built for Pokémon card collectors and resellers.
It started as a scanner + collection manager, and is now evolving into a practical workflow tool for:

- scanning physical cards
- organizing personal inventory
- tracking acquisition candidates
- managing sale listings
- recording completed sales
- estimating profit and net payout

The current direction is **"my cards first"** rather than a public marketplace.

---

## Why this project

Most collector tools focus on either:

- card recognition only
- price lookup only
- community marketplace features

myPCGdex is being built for a different use case:

- quickly identify a card from camera/image input
- store it in a personal collection
- track how much it was bought for
- decide whether it should stay in inventory, become a deal candidate, or be listed for sale
- eventually measure realized / unrealized profit

This makes it closer to a **personal inventory + trading notebook** than a generic collection app.

---

## Current Product Direction

The project has pivoted from a pure scanner app into a **card management & profit tracker**.

### Core goals

- Manage **owned cards** with condition, quantity, and cost basis
- Manage **deal candidates** from domestic marketplaces
- Manage **active sale listings**
- Manage **completed sales**
- Track **profitability**, fees, and sell-through performance
- Support **eBay-oriented payout estimation** including fees, shipping, and FX

### Non-goals for MVP

- Fully automated marketplace crawling
- A public two-sided marketplace
- Social/community features
- Advanced portfolio analytics from day one

---

## Tech Stack

- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend/Database**: Supabase (Auth + RLS, Postgres, Storage)
- **Card Data**: Pokémon TCG API
- **AI/Vision**: Vision model + OCR pipeline for card recognition
- **i18n**: next-intl

---

## Main Features

### 1. Card Scanning

Scan physical Pokémon cards using camera input or uploaded images.

The recognition pipeline combines image preprocessing, OCR/text extraction, vision model analysis, and Pokémon TCG API matching.

### 2. Collection / Inventory

Store identified cards with metadata:

- card identity and image
- quantity and condition
- grading info (grading company, grade, cert number)
- purchase price and market price
- input method

### 3. Deal Inbox

Track acquisition candidates before committing to a purchase.
Deals move through: `candidate → bought → canceled`

### 4. Listing Management

Manage active sale listings per platform.
Listings move through: `active → sold → canceled`
Includes eBay payout estimation with fee auto-calculation.

### 5. Sales & PnL

Record completed sales and track:

- `sold_price` — final sale price
- `fees_cost` — platform fees (eBay: 13.25% FVF + $0.30/order)
- `net_payout` — sold_price minus fees
- `cost_basis` — weighted average acquisition cost
- `realized_pnl` — net_payout minus cost_basis
- `unrealized_pnl` — current market value minus cost_basis for unsold cards

### 6. Dashboard

Summary view with total portfolio value, realized/unrealized PnL, and recent activity.

---

## Workflow

```
Scan / Add Card
    ↓
Collection / Inventory
    ↓
Deal Candidate (optional)
    ↓
Listing
    ↓
Sale
    ↓
Profit Tracking
```

---

## Protected Routes

| Route | Description |
|---|---|
| `/dashboard` | Portfolio stats, PnL overview, recent activity |
| `/deals` | Deal inbox (candidate / bought / canceled) |
| `/listings` | Active listings + settle dialog with fee calc |
| `/sales` | PnL summary cards + sale history |
| `/collection` | Inventory list |
| `/collection/[id]` | Card detail, cost basis panel, listing history |
| `/scan` | Card scanner |
| `/profile` | User profile |

---

## Project Structure

```
src/
├── app/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   ├── deals/
│   │   ├── listings/
│   │   ├── sales/
│   │   ├── collection/
│   │   ├── scan/
│   │   └── profile/
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── actions/         # Server actions (deals, listings, sales)
│   ├── types/           # trade.ts, collection.ts
│   ├── utils/           # pnl.ts, helpers
│   └── supabase/        # Supabase clients
├── components/
│   ├── layout/
│   └── ui/              # shadcn/ui components
└── providers/
```

---

## Database Migrations

| Migration | Description |
|---|---|
| `20260309000001` | Graded card columns added to collections |
| `20260309000002` | `acquisitions` table (deal inbox) |
| `20260309000003` | `listings` table (platform sale listings) |
| `20260309000004` | `sales` table (settlement records) |
| `20260309000005` | `fee_rules` table + eBay 2024 seed data |
| `20260309000006` | `price_snapshots` table |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project
- Pokémon TCG API key (optional)
- Vision API key for card scanning

### Installation

```bash
git clone https://github.com/zoocandoit/myPCGdex.git
cd myPCGdex
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Roadmap

- [ ] Price snapshot manual refresh + chart
- [ ] CSV import/export (tax reporting)
- [ ] eBay fee + FX reflected payout estimation
- [ ] Sale status transition UX polish
- [ ] `/inventory` route alias for `/collection`

---

## License

MIT
