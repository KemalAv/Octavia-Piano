## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. **Setup Supabase:**
   Create a `.env.local` file (in your project root directory) with the following variables:
   - `VITE_SUPABASE_URL`: Found in your Supabase Project Settings -> API (Project URL).
   - `VITE_SUPABASE_ANON_KEY`: Also found in your Supabase Project Settings -> API, under `Project API key` (the `anon public` key).
3. **Supabase SQL Setup:**
   Run the following SQL in your Supabase SQL Editor to create the `get_leaderboard` function. This function calculates the total weighted score for each user based on their best performances on ranked songs.

   ```sql
   create or replace function get_leaderboard()
   returns table (
     user_id uuid,
     username text,
     avatar_url text,
     total_score float
   ) as $$
   begin
     return query
     with user_best_scores as (
       -- Step 1: Get the single best score for each user on each ranked song
       select distinct on (s.user_id, s.song_id)
         s.user_id,
         s.final_score
       from
         scores s
         join songs so on s.song_id = so.id
       where
         so.is_ranked = true
       order by
         s.user_id,
         s.song_id,
         s.final_score desc
     ),
     ranked_user_scores as (
       -- Step 2: For each user, rank their best scores from highest to lowest
       select
         ubs.user_id,
         ubs.final_score,
         row_number() over (partition by ubs.user_id order by ubs.final_score desc) as rn
       from
         user_best_scores ubs
     ),
     user_total_scores as (
       -- Step 3: Calculate the weighted total score for each user
       select
         rus.user_id,
         sum(rus.final_score * (0.98 ^ (rus.rn - 1))) as calculated_total_score
       from
         ranked_user_scores rus
       group by
         rus.user_id
     )
     -- Step 4: Join with profiles and order the final leaderboard
     select
       uts.user_id,
       p.username,
       p.avatar_url,
       uts.calculated_total_score as total_score
     from
       user_total_scores uts
       join profiles p on uts.user_id = p.id
     order by
       total_score desc;
   end;
   $$ language plpgsql;
   ```
4. **Updating Your Database:**
   If you've set up the project before, you may need to add new columns to your tables. Run the following SQL to ensure your `scores` table is up-to-date. It is safe to run this command multiple times.
   ```sql
   ALTER TABLE public.scores
   ADD COLUMN IF NOT EXISTS total_wait_time_ms integer;
   ```

5. Run the app:
   `npm run dev`