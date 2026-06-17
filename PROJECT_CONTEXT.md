# TABLE Project Context

TABLE is a private, image-first PWA food archive for saving home cooking, recipes, restaurant dishes, travel food, and food memories.

## Current Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase database
- Supabase Storage
- Google login
- Vercel deployment
- GitHub repo: https://github.com/chenghsinchan/table-food-archive.git

## Main App Areas

TABLE has three bottom tabs:

- HOME: the visual food archive
- RECIPES: things to cook again
- TONIGHT: dinner inspiration from saved entries

Other routes exist for supporting flows such as adding/editing entries, login, profile setup, auth callback, and individual entry detail pages.

## Supabase Setup

The app uses frontend-safe Supabase variables only:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ALLOWED_EMAILS=chenghsinchan@gmail.com,saulemiezyte@gmail.com
```

Do not use or commit Supabase service-role keys or other secret keys.

The Supabase schema lives in `supabase/schema.sql`. It includes profiles, food entries, photos, tags, entry-tag links, row level security policies, and the `food-photos` storage bucket.

Google sign-in is handled through Supabase Auth. The app checks allowed users with `NEXT_PUBLIC_ALLOWED_EMAILS` and signs out accounts outside the private archive.

## Storage And Images

Food photos upload to the Supabase Storage bucket:

```txt
food-photos
```

Uploads are compressed in the browser before storage:

- maximum width: 1600px
- format: JPEG by default
- target maximum size: about 800 KB

Avatar uploads also use image compression and the same storage bucket.

## PWA And Vercel

PWA files are present in `public/`, including manifest files, app icons, Apple touch icon files, and `public/sw.js`.

The app metadata in `app/layout.tsx` sets the app name to TABLE, references `/manifest.json`, enables Apple web app mode, and points to the app icons.

For Vercel, connect the GitHub repo and add the three frontend-safe environment variables listed above.

## What Is Done

- Local folder is connected to the GitHub repo.
- The working branch is `main`.
- The app builds successfully when run with a supported Node version.
- HOME, RECIPES, and TONIGHT pages exist.
- Bottom navigation shows only HOME, RECIPES, and TONIGHT.
- Supabase client setup uses publishable frontend variables.
- Google login and allowed-email checking are implemented.
- Food photo upload, avatar upload, Supabase Storage, and browser-side compression are implemented.
- PWA manifest and install assets exist.

## Known Follow-Ups

- Use Node 20 or newer locally. The system Node found during recovery was v18.15.0, which is too old for this Next.js project.
- The current TABLE icon is black with a white wordmark, but the wordmark appears too wide/clipped in the 512px icon and should be regenerated with safer margins.
- The CSS wordmark currently uses Cormorant Garamond SemiBold but has `letter-spacing: 0`; the desired brand setting is around `-0.05em`.
- Lint/build pass, but lint reports warnings about `<img>` tags. These are performance warnings, not build failures.
- Generated folders such as `node_modules`, `.next`, and `.npm-cache` take up most local disk space and can be removed later if desired after confirming.
