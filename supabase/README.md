# Supabase setup

1. Create a Supabase project.
2. Run migrations `001` through `005` in numeric order in the Supabase SQL Editor. Migration `004` adds random-income and age-adjusted Event Matrix analytics; migration `005` adds character-ability and portfolio-adjustment analytics.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API.
5. Run `npm run dev` and complete one game round.

To check the data quickly, open [queries/check_player_data.sql](queries/check_player_data.sql), copy it into Supabase Dashboard -> SQL Editor, then click Run. For classroom-level analytics, use [queries/analytics_reports.sql](queries/analytics_reports.sql).

If `001_player_data.sql` was already run before this retry update, run `002_player_data_retry.sql` once as well.

The browser client submits through the `submit_game_run(jsonb)` RPC. The function validates consent and writes the session, chapter events, and assessment answers in one transaction. It is idempotent by session ID and does not grant `SELECT` permission to the browser. Keep the service-role key out of the frontend and never put it in `.env.local`.

Without `.env.local`, or when the network is unavailable, the game continues normally. A completed run is kept in the browser queue and is retried automatically when the configuration and network are available.



