import { createClient } from '@supabase/supabase-js';

// ⚠️ REPLACE WITH YOUR ACTUAL KEYS FROM SUPABASE DASHBOARD
const SUPABASE_URL = 'https://xazmjuzydrlqdniasybt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhem1qdXp5ZHJscWRuaWFzeWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NTkzOTgsImV4cCI6MjA4MDAzNTM5OH0.JeIL30PV9q4TbwYHgfEWVPyzmXkqiI_fIpUOO4goydM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);