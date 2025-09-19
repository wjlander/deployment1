import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://awgxhfpjpdhmbkglhmmj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Z3hoZnBqcGRobWJrZ2xobW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMDU2OTEsImV4cCI6MjA3Mzc4MTY5MX0.y7ferW7X3iV_Z40djqiJGi1GXscO9Sk5yPCRPXh6t34'

// Create Supabase client with hardcoded credentials
export const supabase = createClient(supabaseUrl, supabaseAnonKey)