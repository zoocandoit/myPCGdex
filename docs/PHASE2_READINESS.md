# Phase 2 Readiness

This document explains the infrastructure changes made to prepare for Phase 2 (Supabase Auth & DB schema).

## Middleware & Prefetch Optimization

### Why matcher was updated
The middleware matcher now excludes more static assets to prevent unnecessary session refresh calls:
- `robots.txt`, `sitemap.xml` - SEO files
- `manifest.json`, `sw.js` - PWA files
- Font files (`.woff`, `.woff2`, `.ttf`, `.eot`)

This reduces server load and improves page load performance.

### Why prefetch is disabled on BottomNav
Setting `prefetch={false}` on navigation links prevents Next.js from automatically fetching protected routes in the background. Benefits:
- Reduces unnecessary middleware executions
- Prevents auth checks for pages user hasn't navigated to
- Navigation still works instantly via client-side routing

## Auth Guard Location

**File:** `src/app/(protected)/layout.tsx`

The auth guard uses `supabase.auth.getUser()` (not `getSession()`) because:
- `getUser()` validates the JWT with Supabase Auth server
- `getSession()` only reads from cookies without validation
- This prevents token spoofing attacks

Unauthenticated users are redirected to `/` (home page).

## Environment Validation

**File:** `src/lib/env.ts`

Runtime validation using Zod ensures required env vars are present:
- In development: throws clear error with missing variables
- In production: logs warning but doesn't crash build

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Suggested DB Modeling (Phase 2)

### Table Structure

```
cards_master (read-only, seeded from Pokemon TCG API)
├── id (PK)
├── tcg_id (unique, e.g., "sv1-1")
├── name
├── set_name
├── number
├── rarity
├── image_url
├── prices_json (market prices snapshot)
└── updated_at

user_cards (user inventory)
├── id (PK)
├── user_id (FK → auth.users)
├── card_id (FK → cards_master)
├── condition (enum: mint, near_mint, excellent, good, poor)
├── quantity
├── language (enum: en, jp, ko)
├── acquired_date
├── notes
└── created_at
```

### RLS Policy Basics

```sql
-- users can only see their own cards
CREATE POLICY "Users can view own cards"
ON user_cards FOR SELECT
USING (auth.uid() = user_id);

-- users can only insert their own cards
CREATE POLICY "Users can insert own cards"
ON user_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- users can only update their own cards
CREATE POLICY "Users can update own cards"
ON user_cards FOR UPDATE
USING (auth.uid() = user_id);

-- users can only delete their own cards
CREATE POLICY "Users can delete own cards"
ON user_cards FOR DELETE
USING (auth.uid() = user_id);

-- cards_master is read-only for all authenticated users
CREATE POLICY "Authenticated users can view cards"
ON cards_master FOR SELECT
TO authenticated
USING (true);
```

## Next Steps (Phase 2)

1. Create Supabase project and configure Auth providers
2. Set up database tables with RLS policies
3. Create Storage bucket for card images
4. Implement auth UI (login/signup pages)
5. Test protected routes with real authentication
