# SECOND SKIN ARCHIVE

A body-first wardrobe archive. Understand your body, record your clothes, and
learn which clothes make you feel confident, comfortable, protected, expressive,
or most like yourself.

> Your body is your first skin. Clothing is your second skin.

Not a shopping app. Not an influencer platform. Not a trend app. A quiet
personal archive.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- PWA (vite-plugin-pwa, installable, offline shell)
- `localStorage` for all data (no backend, no login, no payment)

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build (test the PWA / service worker)
```

## Surfaces

| Route        | Page            | Notes                                         |
| ------------ | --------------- | --------------------------------------------- |
| `/`          | Start           | Landing page, full-bleed, no chrome           |
| `/start`     | Home / Today    | "What to wear for how you feel today?" + hub  |
| `/body`      | Body            | Registration + profile (view/edit toggle)     |
| `/wardrobe`  | Wardrobe        | Grid + category filter                        |
| `/add`       | Add Item        | Record a garment                              |
| `/item/:id`  | Clothing Detail | Metadata + "How it feels" sliders + hand note |
| `/journal`   | Outfit Journal  | Daily logs                                     |
| `/people`    | People Like Me  | Mock community cards (no real sharing)         |
| `/archive`   | Archive         | Timeline by month + insight cards             |

## Data model

See [`src/types/index.ts`](src/types/index.ts): `BodyProfile`, `ClothingItem`,
`OutfitLog`, `UserFeeling`, `SimilarProfile`.

Persistence is isolated in [`src/lib/storage.ts`](src/lib/storage.ts) so it can
be swapped for a backend without touching pages.

## Future placeholders (search `TODO`)

- AI body measurement detection (`src/lib/ai.ts`)
- AI clothing recognition (`src/components/PhotoUpload.tsx`, `src/pages/AddItem.tsx`)
- Weather API (`src/lib/ai.ts`, `src/pages/Journal.tsx`)
- Supabase backend (`src/lib/storage.ts`)
- Private sharing + similar-body matching (`src/pages/PeopleLikeMe.tsx`)

## Tone

Language is about comfort, confidence, protection, movement, identity, and
self-understanding. No "beauty score", "ideal body", "ranking", or
"perfect body" — anywhere.
