# TABLE

TABLE is a private, image-first food archive. It keeps home cooking, recipes, restaurant dishes, travel food, and food memories in one calm daily place.

The app has only three main areas:

- `HOME`: visual food album
- `RECIPES`: things to cook again
- `TONIGHT`: dinner inspiration

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If Supabase environment variables are missing, the app uses local seed data so the interface can be reviewed immediately.

## Environment Variables

Copy `.env.example` to `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ALLOWED_EMAILS=chenghsinchan@gmail.com,saulemiezyte@gmail.com
```

Do not commit `.env.local`.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Optionally run `supabase/seed.sql` for demo entries.

The schema creates profiles, food entries, photos, tags, entry-tag links, row level security policies, and the `food-photos` storage bucket.

## Google OAuth Setup

1. In Supabase, open Authentication, then Providers.
2. Enable Google.
3. Add the Google OAuth client ID and secret.
4. Add the Supabase callback URL in Google Cloud.
5. Add redirect URLs in Supabase:

```txt
http://localhost:3000/
https://your-vercel-domain.vercel.app/
```

The app only offers Google login. After login, it checks `NEXT_PUBLIC_ALLOWED_EMAILS`; other accounts are signed out and shown “This archive is private.”

## Storage

Use the Supabase Storage bucket:

```txt
food-photos
```

Uploads are compressed in the browser before storage:

- maximum width: 1600px
- format: JPEG
- target size: roughly 400-800 KB

Original full-resolution photos should be backed up outside the app.

## Vercel Deployment

The GitHub repo is:

```txt
https://github.com/chenghsinchan/table-food-archive.git
```

1. Push changes to GitHub.
2. Import the repo in Vercel.
3. Add the same three environment variables in Vercel.
4. Deploy.

The app updates live when Vercel redeploys. Users do not need the App Store or a reinstall after normal web updates.

## iPhone PWA Install

The app includes a manifest, app icons, Apple touch icon, mobile viewport metadata, and a service worker with a simple offline shell fallback.

To install on iPhone:

1. Open the deployed app in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Keep the name as `TABLE`.

## Update Workflow

1. Make changes locally.
2. Run `npm run build`.
3. Push to GitHub.
4. Let Vercel redeploy.
5. Reopen TABLE from the Home Screen; Safari will pick up the updated web app.

## Notes

- Restaurant and travel food live inside `HOME`, not separate tabs.
- `RECIPES` includes home/recipe entries plus restaurant or travel dishes marked `want_to_recreate`.
- `TONIGHT` recommends from existing entries, favoring rating, distance from recent meals, mood tags, and cookable dishes.
- Supabase secret keys are never used in client code.
