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

## Analytics (founder-only, 2026-07-13)

- Purpose-built, no third-party analytics SDK. One append-only table, `analytics_events` (`supabase/analytics-events.sql`), storing only `user_id`, `event_name`, a small `properties` jsonb (IDs/counts/enums only — never titles, notes, ingredients, photos, or locations), and `created_at`.
- `lib/analytics/track.ts` exports `trackEvent(eventName, properties?)` — client-side, fully typed against `types/analytics.ts`'s `AnalyticsEventPropertiesMap`, attaches the signed-in user automatically, and fails completely silently (never throws, never blocks a save).
- Tracked events: `app_opened` (AuthGate, once per session-ready), `dish_added`/`dish_marked_recreate` (EntryForm, on successful create), `dish_updated`/`dish_deleted` (FoodEntryModal), `meal_planned` (SundayExperience, on adding a dish to the plan), `shopping_list_generated` (SundayExperience, opening the shopping list), `invite_sent` (InviteFriends), `group_created` (GroupProvider — fires for both explicit "Create an archive" and the auto-created personal archive, tagged via a `source` property).
- Query helpers live in `lib/supabase/analytics.ts` (`getTotalUsers`, `getDailyActiveUsers`, `getWeeklyActiveUsers`, `getTotalEventCount`, `getEventCountsByType`, `getEventCountsByDay`, `getRecentEvents`), same shape as `lib/supabase/groups.ts`/`meal-plan.ts`.
- Dashboard: `/admin/analytics` (`app/admin/analytics/page.tsx`), an async server component that redirects to `/` unless the signed-in user's email matches `OWNER_EMAIL`. No chart library — day/type bars are plain divs. A quiet "Analytics" link appears on the profile page only for the owner (`components/profile/AdminLink.tsx`).
- Privacy boundary is enforced twice: the page redirects non-owners server-side, and the database itself only lets `is_app_owner()` (a SECURITY DEFINER SQL function checking the JWT email, same pattern as `is_group_member`) SELECT from `analytics_events` — everyone else may only INSERT their own rows.

## How SUNDAY (weekly meal plan) Works

- `components/sunday/SundayExperience.tsx` shows a Monday-to-Sunday week; arrows move between weeks, "Today" jumps back.
- Every day has three meal slots: Breakfast, Lunch, Dinner. Tap a slot's + to pick a dish; cards tagged "breakfast"/"lunch"/"dinner" are suggested first for that slot.
- Drag a planned dish between days AND slots using its grip handle; tap it to change meal slot, set portions (1–12), mark it as a leftover, or remove it.
- The shopping list merges ingredient lines across all planned meals into one plain list (e.g. "eggs ×3"), alphabetical; leftover meals are skipped and dishes missing ingredients are counted in a note.
- Month view (Week/Month toggle): calendar grid showing planned dish names in each day cell (first two + "+n"); tap a day to open its week. Long press a week row to open a menu with "Copy week" and — once something is copied — "Paste plan" on another week. Week view also has "Copy this week" / "Paste here". The center pill between the arrows shows the current range ("20–26 Jul" / "July 2026") and tapping it jumps back to today.
- Ingredients live on the food card (`food_entries.ingredients`, one per line) — editable in the card's edit mode and on the add form.
- AI ingredient detection: in a card's edit mode, "Detect from photo" sends the card's photo to Google's Gemini 2.5 Flash-Lite (`app/api/ingredients/route.ts`, server-side only) which returns ingredient lines appended to the box for review before saving. Needs `GEMINI_API_KEY` (from https://aistudio.google.com/apikey) as a server-only env var in Vercel; without it the button shows a friendly "not set up yet" message. The key is never exposed to the browser or committed.
- Plans are stored in `meal_plan_items` (see `supabase/sunday-meal-plan.sql`), scoped to the active group with row-level security. Each row has `meal_slot` ('breakfast' | 'lunch' | 'dinner').

## How Invites & Archives Work (accounts)

Note: "Group" was renamed to "Archive" in all user-facing text (2026-07-13). The underlying code, tables, and hooks (`groups`, `group_members`, `GroupProvider`, `useGroups`, etc.) keep their original internal names — only what the user sees changed.

- Two kinds of invites:
  - **App invites** (`app_invites` table, UI in Profile → "Invite friends to TABLE"): invite a friend to TABLE itself by email; share the generated `/join/<token>` link. The friend signs in with Google using that email and can use the app. Each user can send up to 3 app invites; chenghsinchan@gmail.com is exempt (unlimited) via a database trigger.
  - **Archive membership**: an archive member opens Profile → archive → **Edit** and adds a member by email (the person must already have a TABLE account) or removes members.
- **Every signed-in user always has an archive to save into.** If someone reaches the app with zero archives (e.g. accepted an app invite but was never added to anyone's archive), `GroupProvider` auto-creates a personal archive for them on load (named "{their name}'s Archive", or "My Archive" as a fallback) and makes it active — see "Fixed: new users couldn't add a food card" below.
- Limits: max **3 archives per user**, archives are **1–4 people** — enforced both in the UI and by database triggers.
- Access rule (AuthGate): allowed emails OR archive members OR anyone with an app invite get in; everyone else sees the "You need an invitation" screen.
- SQL for all of this: `supabase/app-invites.sql` (also raises the archive limit to 3 and lets members remove other members).

## Paper "human touch" texture

- Warm cream canvas (`--background`) with a fine paper grain applied globally via `body::before` (inline feTurbulence, multiply blend). `app/globals.css`.
- Food cards get hand-cut **deckle edges** via an SVG displacement filter (`#tableDeckle`, defined once in `app/layout.tsx`) applied with the `.card-deckle` class, plus a `.riso-grain` overlay so photos read as printed. The HOME grid uses larger gaps (`gap-3`, `mb-3`) so the wavy edges have room. Disabled under `prefers-reduced-motion`.
- First-login empty archive shows `components/home/FirstDishEmptyState.tsx`: a cut-paper card (deckle edge) with a paper-cut plate + sage sprig, "Your table is set → Add your first dish", and an **Add a dish** button, over faint dashed "slots". Shown only when the archive is truly empty (an empty *search* still shows a plain "No matches").

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

## Archive Sharing (small private archives)

TABLE supports small private archives (called "groups" internally in code/DB) so a food archive can be shared with a few friends.

- **Limits:** each user can be in at most 3 archives; each archive at most 4 members (enforced by database triggers and in the UI).
- **Privacy:** Row Level Security restricts every food entry, photo, and entry-tag to members of the entry's archive. A `food_entries.group_id` column ties each entry to an archive, and a `is_group_member()` helper backs the policies. The old anonymous/public read access was removed — login is required.
- **Default archive:** all original Cheng + Saulė content lives in the "Cheng + Saulė Home" archive. The two allowed emails are auto-enrolled into it via a trigger on profile creation. Everyone else gets a personal archive auto-created on first load (see the bug fix note below).
- **Active archive:** the `GroupProvider` ([lib/groups/GroupProvider.tsx](lib/groups/GroupProvider.tsx)) tracks which archive is active (remembered on `profiles.active_group_id` + localStorage). HOME / TONIGHT / LOVE and new-entry saves are all scoped to the active archive via the archive-aware entry cache.
- **Login gate:** [AuthGate](components/auth/AuthGate.tsx) admits the allowed emails OR any archive member OR anyone with an app invite; people with a pending archive invite see an accept screen; everyone else sees a "need invitation" screen.
- **Archive panel:** on the profile screen ([GroupPanel](components/profile/GroupPanel.tsx)) — current archive, members, switch archive, create archive, and add member by email.
- **Invites (V1 = link, no email provider):** a member creates an invite, which produces a copyable link (`/invite/<token>`) to send manually. The recipient logs in with that Google email and accepts. Real email sending (e.g. Resend + a Supabase Edge Function) can be added later without rework.
- **SQL files:** `supabase/groups-migration.sql` (tables, backfill, RLS) and `supabase/groups-phase2.sql` (auto-enroll trigger), both already applied.
- **Known limitation:** photo *files* sit in a public storage bucket, so a raw image URL is still viewable without login. The database (titles, notes, archive membership) is fully private. Locking image files behind signed URLs is a possible future phase.

## Supabase Setup

The app uses frontend-safe Supabase variables only:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ALLOWED_EMAILS=chenghsinchan@gmail.com
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

### Fixed: new users couldn't add a food card (2026-07-13)
- Symptom: a newly invited user could sign in and reach HOME, but saving a new food card silently failed.
- Root cause: a user who accepted an app invite (see "How Invites & Archives Work") but was never added to anyone's archive had `activeGroupId = null`. The save code sent `group_id: null`, and the archive-scoped row-level-security insert policy (`is_group_member(group_id, auth.uid())`) can never be true when `group_id` is `null` — Postgres NULL never equals anything — so every insert was rejected.
- Fix: `GroupProvider` ([lib/groups/GroupProvider.tsx](lib/groups/GroupProvider.tsx)) now auto-creates a personal archive (named after the user's display name, or "My Archive") for any signed-in user who has zero archives, and makes it active immediately. Every user always has somewhere to save, whether or not anyone has added them to a shared archive yet. No SQL migration needed — the existing archive-creation policies already allow any authenticated user to create one.

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
