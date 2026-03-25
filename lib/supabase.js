import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vjuvivflbjwjcuimdqua.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXZpdmZsYmp3amN1aW1kcXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTYzNTMsImV4cCI6MjA4OTgzMjM1M30.4BH4LIZnJAtYdZsjAH7lYu529PzLhmSgPm0NC9Xs_LY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
