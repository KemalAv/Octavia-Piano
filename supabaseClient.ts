
import { createClient } from '@supabase/supabase-js';

// Fallback values if environment variables are not loaded (e.g., in AI Studio due to .env file renaming).
// For security in a real application, these should ONLY come from environment variables.
// In AI Studio, if .env.local isn't working, paste your public keys here directly.
// You provided these keys previously:
const FALLBACK_SUPABASE_URL = 'https://aigvrsquvxzatahrbbvh.supabase.co'; // <<< PASTE YOUR SUPABASE PROJECT URL HERE
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpZ3Zyc3F1dnh6YXRhaHJiYnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NjQ5NDksImV4cCI6MjA3OTQ0MDk0OX0.T6sYVZmjIiXFiEHIPwxTkCNq_aVW7aAdFwMxBtL_SHA'; // <<< PASTE YOUR SUPABASE ANON KEY HERE

// Use environment variables if they exist, otherwise use the fallback
const supabaseUrl = process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This warning will be logged if both environment variables and fallbacks are missing.
  // The app will still attempt to create the client, which might then fail if values are truly empty.
  console.warn('Supabase URL or Anon Key is missing, even with fallback. Please check `supabaseClient.ts`');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
