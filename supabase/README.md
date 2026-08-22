# Supabase setup

1. Create a Supabase project.
2. Run [`migrations/001_player_data.sql`](migrations/001_player_data.sql) and [`migrations/002_player_data_retry.sql`](migrations/002_player_data_retry.sql) in the Supabase SQL Editor.
3. Copy `.env.example` to `.env.local`.
4. Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Project Settings → API.
5. Run `npm run dev` and complete one game round.

To check the data quickly, open [queries/check_player_data.sql](queries/check_player_data.sql), copy it into Supabase Dashboard -> SQL Editor, then click Run. The first result is the summary of every round; the second result is the four events from the latest round.

If `001_player_data.sql` was already run before this retry update, run `002_player_data_retry.sql` once as well.

The browser client only performs inserts. It generates the session UUID locally so it does not need `SELECT` permission to receive an ID. Keep the service-role key out of the frontend and never put it in `.env.local`.

Without `.env.local`, or when the network is unavailable, the game continues normally. A completed run is kept in the browser queue and is retried automatically when the configuration and network are available.



