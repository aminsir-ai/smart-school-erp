import { createClient } from "@supabase/supabase-js";

// ===============================
// Supabase Configuration
// ===============================

// Your Project URL
const SUPABASE_URL = "https://vjuvivflbjwjcuimdqua.supabase.co";

// Your Public Anon Key
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXZpdmZsYmp3amN1aW1kcXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTYzNTMsImV4cCI6MjA4OTgzMjM1M30.4BH4LIZnJAtYdZsjAH7lYu529PzLhmSgPm0NC9Xs_LY";

// ===============================
// Create Supabase Client
// ===============================

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // safer for your current setup
    },
  }
);