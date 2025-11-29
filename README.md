## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. **Setup Supabase:**
   Create a `.env.local` file (in your project root directory) with the following variables:
   - `GEMINI_API_KEY`: Your Gemini API Key.
   - `VITE_SUPABASE_URL`: Found in your Supabase Project Settings -> API (Project URL).
   - `VITE_SUPABASE_ANON_KEY`: Also found in your Supabase Project Settings -> API, under `Project API key` (the `anon public` key).
   
   **Important for Google AI Studio:** If you experience issues with `.env.local` files (e.g., they get renamed or are not loaded), you may need to **directly paste your Supabase `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into the `supabaseClient.ts` file where marked as `FALLBACK_SUPABASE_URL` and `FALLBACK_SUPABASE_ANON_KEY`**.
   
3. Run the app:
   `npm run dev`

### Troubleshooting Supabase Operations (Upload/Delete)

If you encounter issues with uploading or deleting songs (e.g., "Permission denied" errors or operations failing without clear feedback), please ensure your Supabase Row Level Security (RLS) policies are correctly configured:

*   **Database Schema Update for Difficulty & Analysis Details:**
    To enable the online song browser to display comprehensive difficulty levels and analysis details for uploaded songs, you need to add the following columns to your `public.songs` table in Supabase.
    ```sql
    ALTER TABLE public.songs
    ADD COLUMN difficulty_level REAL,
    ADD COLUMN performance_score REAL,
    ADD COLUMN total_notes INTEGER,       -- Total notes in the song
    ADD COLUMN duration_sec REAL,         -- Song duration in seconds
    ADD COLUMN total_nps REAL,            -- Notes per second
    ADD COLUMN like_count INTEGER DEFAULT 0,
    ADD COLUMN dislike_count INTEGER DEFAULT 0;
    
    -- You might also want to set default values for existing rows
    -- UPDATE public.songs SET difficulty_level = 0, performance_score = 0, total_notes = 0, duration_sec = 0, total_nps = 0 WHERE difficulty_level IS NULL;
    ```
    (Note: `REAL` is used for floating-point numbers, `INTEGER` for whole numbers in PostgreSQL.)

*   **NEW: Database Schema for Ranked Scores:**
    To enable ranked mode leaderboards and personal best scores, you need to create a `scores` table. Go to the `SQL Editor` in your Supabase project and run the following script:
    ```sql
    -- Create the scores table to store ranked game results
    CREATE TABLE public.scores (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
      final_score REAL,
      accuracy REAL,
      speed REAL,
      rank TEXT,
      notes_hit INT,
      errors INT,
      total_notes INT,
      mode TEXT
    );

    -- Create indexes for faster queries on leaderboards
    CREATE INDEX idx_scores_song_id_final_score ON public.scores(song_id, final_score DESC);
    CREATE INDEX idx_scores_user_id_final_score ON public.scores(user_id, final_score DESC);
    ```
    
*   **NEW: Database Schema and Triggers for Song Likes/Dislikes:**
    To enable the like/dislike feature, you must create a `song_likes` table and a database function to automatically update the counts on your `songs` table. Run the following SQL in your Supabase SQL Editor:
    ```sql
    -- 1. Create the song_likes table
    CREATE TABLE public.song_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
      like_type SMALLINT NOT NULL CHECK (like_type IN (1, -1)), -- 1 for like, -1 for dislike
      CONSTRAINT user_song_like_unique UNIQUE (user_id, song_id)
    );

    -- 2. Create the function to update counts
    CREATE OR REPLACE FUNCTION update_song_like_counts()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (TG_OP = 'INSERT') THEN
        IF NEW.like_type = 1 THEN
          UPDATE public.songs SET like_count = like_count + 1 WHERE id = NEW.song_id;
        ELSE
          UPDATE public.songs SET dislike_count = dislike_count + 1 WHERE id = NEW.song_id;
        END IF;
      ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.like_type = 1 AND NEW.like_type = -1 THEN
          UPDATE public.songs SET like_count = like_count - 1, dislike_count = dislike_count + 1 WHERE id = NEW.song_id;
        ELSIF OLD.like_type = -1 AND NEW.like_type = 1 THEN
          UPDATE public.songs SET like_count = like_count + 1, dislike_count = dislike_count - 1 WHERE id = NEW.song_id;
        END IF;
      ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.like_type = 1 THEN
          UPDATE public.songs SET like_count = like_count - 1 WHERE id = OLD.song_id;
        ELSE
          UPDATE public.songs SET dislike_count = dislike_count - 1 WHERE id = OLD.song_id;
        END IF;
      END IF;
      RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
    $$ LANGUAGE plpgsql;

    -- 3. Create the trigger that calls the function
    CREATE TRIGGER on_song_like_change
    AFTER INSERT OR UPDATE OR DELETE ON public.song_likes
    FOR EACH ROW EXECUTE FUNCTION update_song_like_counts();
    ```

*   **NEW: Database Schema for Friends & Nickname Cooldown:**
    Run the following SQL in your Supabase SQL Editor to add the friends system and support for nickname change cooldowns.
    ```sql
    -- 1. Create the friends table to store relationships
    CREATE TABLE public.friends (
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      PRIMARY KEY (user_id, friend_id),
      CONSTRAINT user_cannot_friend_self CHECK (user_id <> friend_id)
    );

    -- 2. Add nickname change tracking to the profiles table
    ALTER TABLE public.profiles
    ADD COLUMN last_nickname_change TIMESTAMPTZ;
    ```

*   **NEW: Database Function for Global Leaderboard:**
    Run this SQL in your Supabase SQL Editor to create a function that calculates the global leaderboard.
    ```sql
    -- This function calculates the total score for each user by summing their highest score on each unique song.
    create or replace function get_leaderboard()
    returns table (
        user_id uuid,
        username text,
        avatar_url text,
        total_score double precision
    ) as $$
    begin
        return query
        with user_song_highest_scores as (
            -- For each user and each song, find their single highest score
            select
                s.user_id,
                s.song_id,
                max(s.final_score) as highest_score_per_song
            from public.scores s
            where s.final_score is not null
            group by s.user_id, s.song_id
        ),
        user_total_scores as (
            -- Sum up the highest scores per song for each user to get their global total
            select
                ushs.user_id,
                sum(ushs.highest_score_per_song) as calculated_total_score_sum
            from user_song_highest_scores ushs
            group by ushs.user_id
        )
        -- Join with profiles to get user info and order by the calculated total score
        select
            p.id::uuid as user_id,
            p.username::text as username,
            p.avatar_url::text as avatar_url,
            coalesce(uts.calculated_total_score_sum, 0.0)::double precision as total_score
        from public.profiles p
        left join user_total_scores uts on p.id = uts.user_id
        order by total_score desc;
    end;
    $$ language plpgsql;
    ```

*   **For the `songs` table:**
    *   You need a `SELECT` policy that allows users to view songs.
    *   You need an `INSERT` policy that allows authenticated users to create new song entries (e.g., `auth.uid() = uploader_id`).
    *   You need an `UPDATE` policy that allows users to modify their own songs (e.g., `auth.uid() = uploader_id`).
    *   You need a `DELETE` policy that allows users to delete their own songs. To allow the admin to delete any song, this policy should be updated to also grant access to the admin's user ID (e.g., `(auth.uid() = uploader_id) OR (auth.uid() = 'YOUR_ADMIN_UUID')`). The admin UUID is defined in `constants.ts`.

*   **NEW: RLS Policies for the `scores` table:**
    After creating the `scores` table, you must enable Row Level Security and add policies. Run this SQL in the `SQL Editor`:
    ```sql
    -- Enable RLS on the new 'scores' table
    ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

    -- Policy for SELECT: Allow anyone to read all scores for public leaderboards
    CREATE POLICY "Allow public read access to scores"
    ON public.scores FOR SELECT
    USING (true);

    -- Policy for INSERT: Allow authenticated users to insert their own scores
    CREATE POLICY "Allow authenticated users to insert their own scores"
    ON public.scores FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

    -- Policy for DELETE: Allow authenticated users to delete their own scores
    CREATE POLICY "Allow users to delete their own scores"
    ON public.scores FOR DELETE
    TO authenticated USING (auth.uid() = user_id);
    ```

*   **NEW: RLS Policies for the `song_likes` table:**
    You must also enable RLS and add policies for the new `song_likes` table:
    ```sql
    -- Enable RLS
    ALTER TABLE public.song_likes ENABLE ROW LEVEL SECURITY;

    -- Allow anyone to read likes
    CREATE POLICY "Allow public read access to song likes"
    ON public.song_likes FOR SELECT
    USING (true);

    -- Allow authenticated users to insert their own likes
    CREATE POLICY "Allow users to insert their own likes"
    ON public.song_likes FOR INSERT
    TO authenticated WITH CHECK (auth.uid() = user_id);

    -- Allow users to update their own likes (to switch between like/dislike)
    CREATE POLICY "Allow users to update their own likes"
    ON public.song_likes FOR UPDATE
    TO authenticated USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    -- Allow users to delete their own likes (to remove a like/dislike)
    CREATE POLICY "Allow users to delete their own likes"
    ON public.song_likes FOR DELETE
    TO authenticated USING (auth.uid() = user_id);
    ```

*   **NEW: RLS Policies for the `friends` table:**
    Run this SQL in the `SQL Editor` to secure the new `friends` table:
    ```sql
    -- Enable RLS on the new 'friends' table
    ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

    -- Users can view their own friendships (who they have added)
    CREATE POLICY "Users can view their own friendships."
    ON public.friends FOR SELECT
    USING (auth.uid() = user_id);

    -- Users can add other users as friends
    CREATE POLICY "Users can add friends."
    ON public.friends FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    -- Users can remove friends they have added
    CREATE POLICY "Users can remove friends."
    ON public.friends FOR DELETE
    USING (auth.uid() = user_id);
    ```

*   **For the `midi-files` storage bucket:**
    *   You need policies that allow authenticated users to `INSERT` (upload), `SELECT` (download), and `DELETE` files within the `midi-files` bucket, especially for paths related to their `uploader_id` (e.g., `users/[uid]/...`).

**3. For the `avatars` storage bucket (Profile Pictures):**

To ensure your avatar URLs are long-lived signed URLs, you should configure your `avatars` bucket as **PRIVATE**. The application will then generate a signed URL with a very long expiry for each uploaded avatar.

*   **NEW: Database Schema for `profiles` table (if not already existing or missing `created_at`):**
    If you haven't already, ensure your `profiles` table includes these columns. The `created_at` column is useful for displaying "Member since" information in the profile modal for other users.

    ```sql
    -- If `profiles` table doesn't exist, create it:
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE NOT NULL,
      avatar_url TEXT NULL,
      created_at TIMESTAMPTZ DEFAULT now() NOT NULL
    );

    -- If `profiles` table exists but `created_at` is missing:
    -- ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT now() NOT NULL;

    -- RLS for profiles table:
    -- Allow everyone to view profiles
    CREATE POLICY "Public profiles are viewable by everyone."
    ON public.profiles FOR SELECT
    USING (true);

    -- Allow users to update their own profile
    CREATE POLICY "Users can update own profile."
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

    -- Allow users to create a profile for themselves
    CREATE POLICY "Users can create own profile."
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
    ```