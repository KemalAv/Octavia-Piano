## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install`
2. **Setup Supabase:**
   Create a `.env.local` file (in your project root directory) with the following variables:
   - `VITE_SUPABASE_URL`: Found in your Supabase Project Settings -> API (Project URL).
   - `VITE_SUPABASE_ANON_KEY`: Also found in your Supabase Project Settings -> API, under `Project API key` (the `anon public` key).
3. **Supabase SQL Setup:**

6. Run the app:
   `npm run dev`