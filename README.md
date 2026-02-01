# myPCGdex

Pokemon card scanner and collection manager. Scan your physical Pokemon cards to identify them, check market prices, and manage your inventory.

## Features

- Scan cards using camera or image upload
- AI-powered card recognition (Vision API)
- Pokemon TCG API integration for card data & prices
- Personal collection management with Supabase

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: TanStack Query
- **Backend/Database**: Supabase (Auth, Postgres, Storage)
- **AI**: OpenAI GPT-4o / Claude 3.5 Sonnet Vision
- **Card Data**: Pokemon TCG API

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenAI or Anthropic API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/zoocandoit/pokeScan.git
cd pokeScan
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (protected)/     # Auth-required routes
│   │   ├── scan/        # Card scanning
│   │   ├── collection/  # Card collection
│   │   └── profile/     # User profile
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── layout/          # Layout components
│   └── ui/              # shadcn/ui components
├── lib/
│   ├── supabase/        # Supabase clients
│   └── utils.ts         # Utilities
└── providers/           # React providers
```

## Development Phases

- [x] Phase 1: Project setup
- [ ] Phase 2: Supabase Auth & DB schema
- [ ] Phase 3: Image upload & Vision AI
- [ ] Phase 4: Pokemon TCG API integration
- [ ] Phase 5: Inventory CRUD
- [ ] Phase 6: UI polish & deployment

## License

MIT
