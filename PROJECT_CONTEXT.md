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

TABLE currently shows two bottom tabs (as of 2026-07-09):

- HOME (`/`): the visual food archive
- SUNDAY (`/sunday`): the shared weekly meal planner (week starts Monday)

Hidden but still working (removed from the nav, nothing deleted):

- TONIGHT (`/tonight`): swipeable deck for dinner inspiration
- LOVE (`/love`): saved favourites (all LOVE data is kept in the database)

Other routes exist for supporting flows such as adding/editing entries, login, profile setup, auth callback, invites, and individual entry detail pages.

Note: the LOVE tab is served by the component named `RecipesExperience` (an earlier "Recipes" tab was renamed to "Love"). The route and label are LOVE; the component name is historical.

## How SUNDAY (weekly meal plan) Works

- `components/sunday/SundayExperience.tsx` shows a Monday-to-Sunday week; arrows move between weeks, "Today" jumps back.
- Every day has three meal slots: Breakfast, Lunch, Dinner. Tap a slot's + to pick a dish; cards tagged "breakfast"/"lunch"/"dinner" are suggested first for that slot.
- Drag a planned dish between days AND slots using its grip handle; tap it to change meal slot, set portions (1–12), mark it as a leftover, or remove it.
- The shopping list merges ingredient lines across all planned meals into one plain list (e.g. "eggs ×3"), alphabetical; leftover meals are skipped and dishes missing ingredients are counted in a note.
- Month view (Week/Month toggle): calendar grid showing planned dish names in each day cell (first two + "+n"); tap a day to open its week. Long press a week row to open a menu with "Copy week" and — once something is copied — "Paste plan" on another week. Week view also has "Copy this week" / "Paste here". The center pill between the arrows shows the current range ("20–26 Jul" / "July 2026") and tapping it jumps back to today.
- Ingredients live on the food card (`food_entries.ingredients`, one per line) — editable in the card's edit mode and on the add form.
- AI ingredient detection: in a card's edit mode, "Detect from photo" sends the card's photo to Google's Gemini 2.5 Flash-Lite (`app/api/ingredients/route.ts`, server-side only) which returns ingredient lines appended to the box for review before saving. Needs `GEMINI_API_KEY` (from https://aistudio.google.com/apikey) as a server-only env var in Vercel; without it the button shows a friendly "not set up yet" message. The key is never exposed to the browser or committed.
- Plans are stored in `meal_plan_items` (see `supabase/sunday-meal-plan.sql`), scoped to the active group with row-level security. Each row has `meal_slot` ('breakfast' | 'lunch' | 'dinner').

## How LOVE Works

- All three tabs share one in-memory entry cache (`lib/entries/EntryCacheProvider.tsx`). LOVE simply shows `entries.filter((entry) => entry.isLoved)`.
- An entry is considered loved when `food_entries.is_loved = true` (or, on older databases, when it carries a "Love" tag — kept as a fallback).
- Saving from TONIGHT: swipe a card right (or tap the heart) → `setEntryLovedInSupabase()` in `lib/supabase/save-entry.ts` runs `update({ is_loved: true })` on the existing row. It updates the existing entry, never inserts a duplicate; if the card is already loved it does nothing. After a successful save the shared cache is updated so the card appears in LOVE immediately.
- Removing from LOVE: in the LOVE tab, the same function runs with `false`.
- Both allowed users can save, because the row-level-security UPDATE policies apply to every authenticated user.

## How The HOME Detail Modal Works

- Tapping a card in HOME opens `components/entry/FoodEntryModal.tsx` as a sheet over the page. HOME itself does not navigate, so its scroll position is preserved when the sheet closes.
- Ways to close: the X button (top right), tapping the dimmed backdrop, the Esc key, or **swiping up past the end of the card** ("pull up past the end" — scroll normally, and once you reach the bottom keep swiping up to dismiss; short cards close on any firm upward swipe). Trackpad/mouse: scroll past the bottom.
- The swipe-to-close gesture is intentionally disabled while editing, typing, or interacting with buttons/inputs/links.

## Group Sharing (small private groups)

TABLE supports small private groups so the archive can be shared with a few friends.

- **Limits:** each user can be in at most 2 groups; each group at most 4 members (enforced by database triggers and in the UI).
- **Privacy:** Row Level Security restricts every food entry, photo, and entry-tag to members of the entry's group. A `food_entries.group_id` column ties each entry to a group, and a `is_group_member()` helper backs the policies. The old anonymous/public read access was removed — login is required.
- **Default group:** all original Cheng + Saulė content lives in the "Cheng + Saulė Home" group. The two allowed emails are auto-enrolled into it via a trigger on profile creation.
- **Active group:** the `GroupProvider` ([lib/groups/GroupProvider.tsx](lib/groups/GroupProvider.tsx)) tracks which group is active (remembered on `profiles.active_group_id` + localStorage). HOME / TONIGHT / LOVE and new-entry saves are all scoped to the active group via the group-aware entry cache.
- **Login gate:** [AuthGate](components/auth/AuthGate.tsx) admits the allowed emails OR any group member; people with a pending invite see an accept screen; everyone else sees a "need invitation" screen.
- **Group panel:** on the profile screen ([GroupPanel](components/profile/GroupPanel.tsx)) — current group, members, switch group, create group, and invite by email.
- **Invites (V1 = link, no email provider):** a member creates an invite, which produces a copyable link (`/invite/<token>`) to send manually. The recipient logs in with that Google email and accepts. Real email sending (e.g. Resend + a Supabase Edge Function) can be added later without rework.
- **SQL files:** `supabase/groups-migration.sql` (tables, backfill, RLS) and `supabase/groups-phase2.sql` (auto-enroll trigger), both already applied.
- **Known limitation:** photo *files* sit in a public storage bucket, so a raw image URL is still viewable without login. The database (titles, notes, group membership) is fully private. Locking image files behind signed URLs is a possible future phase.

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
- HOME, TONIGHT, and LOVE pages exist.
- Bottom navigation shows only HOME, TONIGHT, and LOVE.
- Supabase client setup uses publishable frontend variables.
- Google login and allowed-email checking are implemented.
- Food photo upload, avatar upload, Supabase Storage, and browser-side compression are implemented.
- PWA manifest and install assets exist.

## Known Bugs & Fixes

### Fixed: TONIGHT "Couldn't save this to LOVE" (2026-06-17)
- Symptom: swiping a TONIGHT card right showed "Could not save this to LOVE."
- Root cause: a database error during the save was being hidden behind a generic message (Supabase errors are plain objects, not JS `Error`s, so the UI showed the fallback text). The most likely underlying cause was the live database missing the `is_loved` column or the UPDATE row-level-security policy.
- Code fix: `setEntryLovedInSupabase()` in `lib/supabase/save-entry.ts` now confirms the row was actually updated (`.select("id")`), falls back to the Love tag if zero rows changed, and surfaces the real database message instead of the generic fallback.
- Database fix: run `supabase/ensure-love-support.sql` once in the Supabase SQL Editor to guarantee the `is_loved` column and UPDATE policies exist. It is idempotent and non-destructive (no resets, no deletes).

### Fixed: HOME detail card would not close by swiping up (2026-06-17)
- Symptom: tapping a HOME card opened the detail sheet, but swiping up did not close it.
- Root cause: the gesture in `components/entry/FoodEntryModal.tsx` was wired to close on swipe **down**.
- Fix: switched to "pull up past the end" — scroll the card normally, and an upward swipe past the bottom (or any firm upward swipe on a short card) closes it. The X button, backdrop tap, and Esc still work; the gesture stays disabled while editing/typing.

## Known Follow-Ups

- Use Node 20 or newer locally. The system Node found during recovery was v18.15.0, which is too old for this Next.js project.
- The current TABLE icon is black with a white wordmark, but the wordmark appears too wide/clipped in the 512px icon and should be regenerated with safer margins.
- The CSS wordmark currently uses Cormorant Garamond SemiBold but has `letter-spacing: 0`; the desired brand setting is around `-0.05em`.
- Lint/build pass, but lint reports warnings about `<img>` tags. These are performance warnings, not build failures.
- Generated folders such as `node_modules`, `.next`, and `.npm-cache` take up most local disk space and can be removed later if desired after confirming.
