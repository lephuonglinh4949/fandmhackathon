# Elsewhere

Elsewhere is a React and Vite photo-sharing app with email/password accounts, friend requests, shared photo feeds, and location markers.

## Run locally

1. Install dependencies with `npm install`.
2. Create a Supabase project.
3. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the Supabase project's API settings. The legacy anon key is also accepted as `VITE_SUPABASE_ANON_KEY`.
4. Apply the SQL files in `supabase/migrations` to the project in filename order, using the Supabase SQL Editor or Supabase CLI after linking the project.
5. In Supabase Authentication settings, enable email/password sign-in and configure the site URL and allowed redirect URLs for the local and deployed app.
6. Run `npm run dev`.

The migrations create the social tables, Row Level Security policies, private `moments` image bucket, email-based friend-request functions, and connected-profile lookup. Apply every migration, including `20261108020000_daily_moments.sql`, to enable the daily photo limit. A user can share one photo per UTC calendar day; today's photos leave the feed and map at midnight UTC. Friend requests only reveal the email addresses of people in an existing pending or accepted connection; there is no public account directory.

Only the Supabase project URL and publishable/anon key belong in the Vite environment. Never put a Supabase service-role key in this frontend.

## Checks

- `npm run lint`
- `npm run build`
