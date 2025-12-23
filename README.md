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
   If you've set up the project before, you may need to add new columns or functions to your database. Run the following SQL to ensure your tables and functions are up-to-date. It is safe to run these commands multiple times.
   ```sql
   -- Add columns to scores table for performance details
   ALTER TABLE public.scores
   ADD COLUMN IF NOT EXISTS total_wait_time_ms integer;

   ALTER TABLE public.scores
   ADD COLUMN IF NOT EXISTS gameplay_style TEXT;

   -- Add columns to profiles table for lifetime stats
   ALTER TABLE public.profiles
   ADD COLUMN IF NOT EXISTS total_playtime_ms BIGINT DEFAULT 0,
   ADD COLUMN IF NOT EXISTS total_notes_hit BIGINT DEFAULT 0;

   -- Add RPC function to atomically increment user stats
   create or replace function increment_user_stats(playtime_ms_to_add bigint, notes_hit_to_add bigint)
   returns void as $$
   begin
     if auth.uid() is not null then
       update public.profiles
       set
         total_playtime_ms = COALESCE(total_playtime_ms, 0) + playtime_ms_to_add,
         total_notes_hit = COALESCE(total_notes_hit, 0) + notes_hit_to_add
       where id = auth.uid();
     end if;
   end;
   $$ language plpgsql;

   -- Add arranger column to songs table for arrangement credits
   ALTER TABLE public.songs
   ADD COLUMN IF NOT EXISTS arranger TEXT;
   ```

5. **Database Performance Fixes (Recommended):**
   The following SQL commands resolve performance warnings from the Supabase database linter. Run these in your Supabase SQL Editor. It is safe to run them multiple times.
   ```sql
   -- FIX 1: Duplicate Indexes
   -- Drops redundant indexes on the `scores` table to save space and speed up writes.
   DROP INDEX IF EXISTS public.idx_scores_song_id_final_score;
   DROP INDEX IF EXISTS public.scores_user_song_unique;
   DROP INDEX IF EXISTS public.user_song_unique;

   -- FIX 2: RLS Policy Optimization
   -- Replaces inefficient and redundant policies with optimized versions.
   
   -- Step 2.1: Clean up old policies on the `friends` table.
   DROP POLICY IF EXISTS "Users can view their own friendships." ON public.friends;
   DROP POLICY IF EXISTS "Users can add friends." ON public.friends;
   DROP POLICY IF EXISTS "Users can remove friends." ON public.friends;
   DROP POLICY IF EXISTS "Users can view their friendships" ON public.friends;
   DROP POLICY IF EXISTS "Users can send friend requests" ON public.friends;
   DROP POLICY IF EXISTS "Recipient can accept a pending friend request" ON public.friends;
   DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friends;

   -- Step 2.2: Create new, optimized policies for the `friends` table.
   -- This combines logic and uses `(SELECT auth.uid())` for performance.
   
   -- SELECT: Users can see friendships they are a part of.
   CREATE POLICY "Allow authenticated users to view their friendships"
   ON public.friends FOR SELECT
   USING ( (SELECT auth.uid()) IN (user_id, friend_id) );
   
   -- INSERT: Users can send friend requests.
   CREATE POLICY "Allow authenticated users to send friend requests"
   ON public.friends FOR INSERT
   WITH CHECK ( (SELECT auth.uid()) = user_id AND status = 'pending' );
   
   -- UPDATE: The recipient of a request can accept it.
   CREATE POLICY "Allow recipients to accept friend requests"
   ON public.friends FOR UPDATE
   USING ( (SELECT auth.uid()) = friend_id AND status = 'pending' )
   WITH CHECK ( status = 'accepted' );
   
   -- DELETE: Either user involved in a friendship can delete it.
   CREATE POLICY "Allow users to remove their friendships"
   ON public.friends FOR DELETE
   USING ( (SELECT auth.uid()) IN (user_id, friend_id) );
   
   
   -- Step 2.3: Clean up old policies on the `profiles` table.
   DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
   DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;

   -- Step 2.4: Recreate a single, clear policy for viewing profiles.
   CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
     FOR SELECT
     USING (true);
   ```

6. Run the app:
   `npm run dev`